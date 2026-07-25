"""Smart Savor — Patient Intake Ingestion Agent (Agent 1).

Reads a patient HEALTH / LAB REPORT (US lab report or full-body checkup; PDF or
plain-text/markdown) and auto-fills the structured patient profile: demographics,
vitals (BMI, blood pressure), and every measured biomarker (value + unit + reference
range + the lab's H/L flag). Product-relevant biomarkers are routed to `lab_results`;
everything else is kept in `other_analytes` so nothing is lost. It then persists via
the in-memory `store`.

Field template: see docs/Background/health-report-template.md (the hybrid US-lab ×
full-body-checkup superset; this agent extracts the scoped subset + an other bucket).

Design (see smart-savor-agent-prompts.md, Agent 1):
- Deterministic, single-shot structured extraction — NOT an agent loop.
- Honest about missing data: every field carries confidence + needs_review; the agent
  never fabricates a value it cannot read.
- Clinical authority stays human: it TRANSCRIBES each value and the lab's own flag but
  NEVER decides a "gap" or sets a clinical target (see store.upsert_patient).

Runs three ways:
- LIVE  — ANTHROPIC_API_KEY set: Anthropic SDK, forced tool call (native PDF vision).
- CLI   — authenticated `claude` CLI (no API key needed).
- MOCK  — offline deterministic parser of the bundled sample report (no key, or
          SMART_SAVOR_MOCK_INTAKE=1).
"""

from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess

import store

DEFAULT_MODEL = os.getenv("SMART_SAVOR_INTAKE_MODEL", "claude-haiku-4-5-20251001")

HEALTH_REPORT_SYSTEM_PROMPT = """You are the Patient Intake Ingestion Agent for Smart Savor.
You read a single patient health / lab report (a US lab report or a full-body checkup)
and extract a structured record: demographics, vitals, and every measured biomarker.

Accuracy and honesty matter more than coverage. A wrong value corrupts every downstream
recommendation.

RULES:
- TRANSCRIBE exactly what the report states: for each analyte capture name, numeric value,
  unit, the printed reference range, and the lab's own flag (High/Low/Normal/etc.).
- Extract ONLY what is present. If a value is blank, illegible, or missing, set value=null
  with a low confidence and needs_review=true — NEVER fabricate a value or a flag.
- You do NOT decide what is a "gap to close" and you do NOT set clinical targets — that is
  the dietitian's job. You only record the measured values and the lab's flags.
- Capture demographics (name, DOB, age, sex) and vitals (BMI, blood pressure) when present.
- If the report is unreadable or too sparse (no name plus at least one analyte), set
  overall_status="insufficient_data".
- Always respond by calling the record_health_report tool. Do not write prose."""


# --- Extraction schema (single source of truth for live + mock) -----------------
def _field(value_types: list[str]) -> dict:
    return {
        "type": "object", "additionalProperties": False,
        "required": ["value", "confidence", "needs_review"],
        "properties": {
            "value": {"type": value_types},
            "confidence": {"type": "number"},
            "needs_review": {"type": "boolean"},
        },
    }


_ANALYTE_ITEM = {
    "type": "object", "additionalProperties": False,
    "required": ["panel", "name", "value", "unit", "reference_text", "flag",
                 "confidence", "needs_review"],
    "properties": {
        "panel": {"type": ["string", "null"]},
        "name": {"type": "string"},
        "value": {"type": ["number", "null"]},
        "unit": {"type": ["string", "null"]},
        "reference_text": {"type": ["string", "null"]},
        "flag": {"type": ["string", "null"]},          # High|Low|Normal|Critical|Alert|null
        "confidence": {"type": "number"},
        "needs_review": {"type": "boolean"},
    },
}

HEALTH_REPORT_SCHEMA = {
    "name": "record_health_report",
    "description": "Record the structured contents of a patient health / lab report.",
    # strict:True's constrained-decoding grammar compiler rejects this schema as too large
    # (confirmed live against the API — "compiled grammar is too large"). tool_choice already
    # forces this exact tool, so strict mode buys nothing here beyond validation we already do
    # in to_store_profile()/_field().
    "strict": False,
    "input_schema": {
        "type": "object", "additionalProperties": False,
        "required": ["report_meta", "vitals", "analytes", "conditions", "overall_status"],
        "properties": {
            "report_meta": {
                "type": "object", "additionalProperties": False,
                "required": ["patient_name", "date_of_birth", "age", "sex",
                             "date_collected", "fasting", "ordering_physician",
                             "performing_lab"],
                "properties": {
                    "patient_name": _field(["string", "null"]),
                    "date_of_birth": _field(["string", "null"]),
                    "age": _field(["integer", "null"]),
                    "sex": _field(["string", "null"]),
                    "date_collected": _field(["string", "null"]),
                    "fasting": _field(["string", "null"]),
                    "ordering_physician": _field(["string", "null"]),
                    "performing_lab": _field(["string", "null"]),
                },
            },
            "vitals": {
                "type": "object", "additionalProperties": False,
                "required": ["bmi", "blood_pressure_systolic", "blood_pressure_diastolic"],
                "properties": {
                    "bmi": _field(["number", "null"]),
                    "blood_pressure_systolic": _field(["integer", "null"]),
                    "blood_pressure_diastolic": _field(["integer", "null"]),
                },
            },
            "analytes": {"type": "array", "items": _ANALYTE_ITEM},
            "conditions": {"type": "array", "items": {"type": "string"}},
            "overall_status": {"type": "string", "enum": ["parsed", "insufficient_data"]},
        },
    },
}

# Biomarkers Smart Savor acts on (scoped subset). Everything else -> other_analytes.
_PRODUCT_RELEVANT = (
    "hba1c", "a1c", "glucose",
    "cholesterol", "ldl", "hdl", "triglyceride",
    "iron", "ferritin",
    "vitamin d", "vitamin b12", "b12", "folate",
    "magnesium", "calcium", "potassium", "sodium",
)


def is_product_relevant(analyte_name: str) -> bool:
    n = (analyte_name or "").lower()
    return any(k in n for k in _PRODUCT_RELEVANT)


# --- Document reading -----------------------------------------------------------
def read_document(path: str) -> dict:
    """Anthropic content block for a .pdf (base64) / .txt / .md (text) file."""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        with open(path, "rb") as f:
            data = base64.standard_b64encode(f.read()).decode("ascii")
        return {"type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": data}}
    if ext in (".txt", ".md"):
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        return {"type": "document",
                "source": {"type": "text", "media_type": "text/plain", "data": text}}
    raise ValueError(f"unsupported document type: {ext!r} (want .pdf, .txt, or .md)")


# --- Live extraction (Anthropic SDK) --------------------------------------------
def extract_profile_live(doc_block: dict, *, model: str = DEFAULT_MODEL) -> dict:
    import anthropic  # lazy: offline modes have no hard dependency on the SDK

    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=model, max_tokens=4096,
        system=HEALTH_REPORT_SYSTEM_PROMPT,
        tools=[HEALTH_REPORT_SCHEMA],
        tool_choice={"type": "tool", "name": "record_health_report"},
        messages=[{"role": "user", "content": [
            doc_block,
            {"type": "text", "text": "Extract the health report using the "
                                     "record_health_report tool. Transcribe every analyte "
                                     "with its value, unit, reference range and flag. Emit "
                                     "needs_review for anything not clearly stated; never "
                                     "invent values."},
        ]}],
    )
    return next(b for b in resp.content if b.type == "tool_use").input


# --- CLI extraction (authenticated `claude` CLI; no API key) --------------------
_JSON_SKELETON = """{
  "report_meta": {
    "patient_name": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
    "date_of_birth": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
    "age": {"value": <integer|null>, "confidence": <0-1>, "needs_review": <bool>},
    "sex": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
    "date_collected": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
    "fasting": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
    "ordering_physician": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
    "performing_lab": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>}
  },
  "vitals": {
    "bmi": {"value": <number|null>, "confidence": <0-1>, "needs_review": <bool>},
    "blood_pressure_systolic": {"value": <integer|null>, "confidence": <0-1>, "needs_review": <bool>},
    "blood_pressure_diastolic": {"value": <integer|null>, "confidence": <0-1>, "needs_review": <bool>}
  },
  "analytes": [
    {"panel": <string|null>, "name": <string>, "value": <number|null>, "unit": <string|null>,
     "reference_text": <string|null>, "flag": <"High"|"Low"|"Normal"|"Critical"|null>,
     "confidence": <0-1>, "needs_review": <bool>}
  ],
  "conditions": [<string>],
  "overall_status": "parsed" | "insufficient_data"
}"""


def claude_cli_available() -> bool:
    return shutil.which("claude") is not None


def _read_text_for_cli(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext in (".txt", ".md"):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    if ext == ".pdf":
        try:
            import pypdf
        except ImportError as e:
            raise RuntimeError("PDF via the CLI backend needs `pypdf`; use the API-key "
                               "path for native PDF vision, or pip install pypdf.") from e
        return "\n".join((p.extract_text() or "") for p in pypdf.PdfReader(path).pages)
    raise ValueError(f"unsupported document type: {ext!r}")


def extract_profile_cli(path: str) -> dict:
    doc_text = _read_text_for_cli(path)
    prompt = (
        f"{HEALTH_REPORT_SYSTEM_PROMPT}\n\n"
        "Return ONLY a single JSON object matching EXACTLY this schema "
        "(no prose, no markdown code fences):\n"
        f"{_JSON_SKELETON}\n\n"
        "=== HEALTH REPORT START ===\n"
        f"{doc_text}\n"
        "=== HEALTH REPORT END ==="
    )
    proc = subprocess.run(
        ["claude", "-p", "--output-format", "json"],
        input=prompt, capture_output=True, text=True, timeout=180,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI failed (exit {proc.returncode}): {proc.stderr[:500]}")
    envelope = json.loads(proc.stdout)
    return _parse_json_answer(envelope.get("result", proc.stdout))


def _parse_json_answer(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.DOTALL).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"no JSON object found in model output: {raw[:200]!r}")
    return json.loads(text[start:end + 1])


# --- Mock extraction (offline, deterministic parser of the sample report) -------
def _f(value, confidence, needs_review):
    return {"value": value, "confidence": confidence, "needs_review": needs_review}


def _labeled(text: str, label: str) -> str | None:
    m = re.search(rf"^{re.escape(label)}\s*:\s*(.*)$", text, re.MULTILINE | re.IGNORECASE)
    return m.group(1).strip() if m else None


_ANALYTE_RE = re.compile(
    r"^\s*([A-Za-z0-9 ,()\-/'.]+?):\s*(--|N/?A|[\d.]+)\s*([A-Za-z%/0-9^.]*)\s*"
    r"(?:\[([^\]]*)\])?\s*(HIGH|LOW|NORMAL|CRITICAL|ALERT)?\s*$",
    re.IGNORECASE)

_CONDITION_KEYWORDS = ["type 2 diabetes", "type 1 diabetes", "hyperlipidemia",
                       "hypertension", "chronic kidney disease", "anemia",
                       "vitamin d deficiency", "cardiovascular risk"]


def extract_profile_mock(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as fh:
        text = fh.read()

    def meta(label, conf=0.95):
        raw = _labeled(text, label)
        return _f(raw or None, conf if raw else 0.0, not raw)

    name_raw = _labeled(text, "Patient Name")
    m_age = re.search(r"Age\s*:?\s*(\d{1,3})", text)
    m_sex = re.search(r"Sex\s*:?\s*([A-Za-z]+)", text)
    m_dc = re.search(r"Date Collected\s*:?\s*([0-9/\-]+)", text)
    m_fast = re.search(r"Fasting\s*:?\s*([A-Za-z]+)", text)
    report_meta = {
        "patient_name": _f(name_raw or None, 0.97 if name_raw else 0.0, not name_raw),
        "date_of_birth": meta("Date of Birth"),
        "age": _f(int(m_age.group(1)), 0.95, False) if m_age else _f(None, 0.0, True),
        "sex": _f(m_sex.group(1) if m_sex else None, 0.95 if m_sex else 0.0, not m_sex),
        "date_collected": _f(m_dc.group(1) if m_dc else None, 0.9 if m_dc else 0.0, not m_dc),
        "fasting": _f(m_fast.group(1) if m_fast else None, 0.9 if m_fast else 0.0, not m_fast),
        "ordering_physician": meta("Ordering Physician"),
        "performing_lab": meta("Performing Lab"),
    }

    m_bmi = re.search(r"BMI\s*:?\s*([\d.]+)", text)
    m_bp = re.search(r"Blood Pressure\s*:?\s*(\d+)\s*/\s*(\d+)", text)
    vitals = {
        "bmi": _f(float(m_bmi.group(1)), 0.95, False) if m_bmi else _f(None, 0.0, True),
        "blood_pressure_systolic": _f(int(m_bp.group(1)), 0.9, False) if m_bp else _f(None, 0.0, True),
        "blood_pressure_diastolic": _f(int(m_bp.group(2)), 0.9, False) if m_bp else _f(None, 0.0, True),
    }

    analytes = _extract_analytes(text)
    conditions = _extract_conditions(text)
    parsed_ok = bool(name_raw) and len(analytes) > 0
    return {
        "report_meta": report_meta, "vitals": vitals, "analytes": analytes,
        "conditions": conditions,
        "overall_status": "parsed" if parsed_ok else "insufficient_data",
    }


def _extract_analytes(text: str) -> list[dict]:
    """Walk the report line-by-line; ALL-CAPS lines are panel headers, indented
    'Name: value unit [ref] FLAG' lines are analytes under the current panel."""
    out: list[dict] = []
    panel = None
    in_results = False
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        # only scan analytes after the results marker (skips the title banner + header block)
        if "LABORATORY RESULTS" in s.upper():
            in_results = True
            continue
        if not in_results or s.startswith("=") or s.startswith("-"):
            continue
        # panel header: uppercase, no value colon-pair
        if s.isupper() and ":" not in s:
            panel = s.title()
            continue
        if panel in (None, "Vitals"):   # vitals handled separately
            continue
        m = _ANALYTE_RE.match(line)
        if not m:
            continue
        name, raw_val, unit, ref, flag = m.groups()
        name = name.strip()
        missing = raw_val in ("--", "N/A", "NA")
        value = None if missing else float(raw_val)
        out.append({
            "panel": panel,
            "name": name,
            "value": value,
            "unit": (unit or "").strip() or None,
            "reference_text": (ref or "").strip() or None,
            "flag": flag.title() if flag else None,
            "confidence": 0.0 if missing else 0.9,
            "needs_review": missing,
        })
    return out


def _extract_conditions(text: str) -> list[str]:
    low = text.lower()
    return [c.title() for c in _CONDITION_KEYWORDS if c in low]


# --- Dispatcher -----------------------------------------------------------------
def _backend() -> str:
    if os.getenv("SMART_SAVOR_MOCK_INTAKE") == "1":
        return "mock"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "live"
    if os.getenv("SMART_SAVOR_NO_CLI") != "1" and claude_cli_available():
        return "cli"
    return "mock"


def extract_profile(path: str, *, model: str = DEFAULT_MODEL) -> tuple[dict, str]:
    """Extract a health report from `path`. Returns (extracted_schema_dict, mode)."""
    backend = _backend()
    if backend == "live":
        return extract_profile_live(read_document(path), model=model), "live"
    if backend == "cli":
        return extract_profile_cli(path), "cli"
    return extract_profile_mock(path), "mock"


# --- Map extraction -> store shape ----------------------------------------------
def _analyte_row(a: dict) -> dict:
    return {"panel": a.get("panel"), "name": a["name"], "value": a.get("value"),
            "unit": a.get("unit"), "reference_text": a.get("reference_text"),
            "flag": a.get("flag")}


def to_store_profile(extracted: dict) -> dict:
    """Map the extraction schema into the flat store profile. Routes product-relevant
    analytes to `lab_results` and the rest to `other_analytes`; collects needs_review."""
    review_fields: list[str] = []
    flat: dict = {}

    meta = extracted.get("report_meta", {})
    flat["name"] = (meta.get("patient_name") or {}).get("value")
    flat["age"] = (meta.get("age") or {}).get("value")
    sex = (meta.get("sex") or {}).get("value")
    flat["gender"] = sex.lower() if isinstance(sex, str) else None
    flat["date_of_birth"] = (meta.get("date_of_birth") or {}).get("value")
    for k in ("patient_name", "age", "sex"):
        if (meta.get(k) or {}).get("needs_review"):
            review_fields.append(k)
    flat["report_meta"] = {
        "date_collected": (meta.get("date_collected") or {}).get("value"),
        "fasting": (meta.get("fasting") or {}).get("value"),
        "ordering_physician": (meta.get("ordering_physician") or {}).get("value"),
        "performing_lab": (meta.get("performing_lab") or {}).get("value"),
    }

    vitals = extracted.get("vitals", {})
    flat["bmi"] = (vitals.get("bmi") or {}).get("value")
    sys_, dia = (vitals.get("blood_pressure_systolic") or {}).get("value"), \
                (vitals.get("blood_pressure_diastolic") or {}).get("value")
    flat["blood_pressure"] = {"systolic": sys_, "diastolic": dia} if (sys_ or dia) else None

    lab_results, other = [], []
    for a in extracted.get("analytes", []):
        (lab_results if is_product_relevant(a["name"]) else other).append(_analyte_row(a))
        if a.get("needs_review"):
            review_fields.append(a["name"])
    flat["lab_results"] = lab_results
    flat["other_analytes"] = other

    flat["conditions"] = list(extracted.get("conditions", []))
    flat["review_fields"] = review_fields
    return flat


# --- End-to-end -----------------------------------------------------------------
def ingest(path: str, patient_id: str, *, model: str = DEFAULT_MODEL) -> dict:
    """Read -> extract -> map -> persist. Returns extraction, mode, and upsert result."""
    extracted, mode = extract_profile(path, model=model)
    profile = to_store_profile(extracted)
    upsert = store.upsert_patient(patient_id, profile)
    return {"mode": mode, "overall_status": extracted.get("overall_status"),
            "extracted": extracted, "stored_profile": profile, "upsert": upsert}
