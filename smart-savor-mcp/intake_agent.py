"""Smart Savor — Patient Intake Ingestion Agent (Agent 5).

Reads a patient intake document (PDF or plain-text/markdown) and auto-fills the
structured patient profile: demographics (name, age, gender, blood group), medical
history, and dietary constraints. It then persists via the in-memory `store`.

Design (see smart-savor-agent-prompts.md, Agent 5):
- Deterministic, single-shot structured extraction — NOT an agent loop. The live path
  forces one tool call so Claude returns schema-validated JSON.
- Honest about missing data: every field carries a confidence + needs_review flag; the
  agent never fabricates a value it cannot read.
- Clinical authority stays human: it never writes flagged_gaps (see store.upsert_patient).

Runs two ways:
- LIVE   — when ANTHROPIC_API_KEY is set: real Claude vision/document extraction.
- MOCK   — offline fallback (no key, or SMART_SAVOR_MOCK_INTAKE=1): a deterministic
           parser of the bundled dummy .txt so the demo/tests run without a key.
"""

from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess

import store

# Cheap-extraction tier per the tech stack; override via arg or SMART_SAVOR_INTAKE_MODEL.
DEFAULT_MODEL = os.getenv("SMART_SAVOR_INTAKE_MODEL", "claude-haiku-4-5-20251001")

INTAKE_SYSTEM_PROMPT = """You are the Patient Intake Ingestion Agent for Smart Savor.
You read a single patient intake document and extract a structured profile: demographics
(name, age, gender, blood group), medical history, dietary constraints, and recorded
measurements (BMI, and any vitamin / mineral levels stated on the intake bloodwork).

Accuracy and honesty matter more than coverage. A wrong profile corrupts every downstream
recommendation.

RULES:
- Extract ONLY what the document actually states. Never invent or infer a value that is not
  present. If a field is blank, illegible, or missing, set value=null, a low confidence, and
  needs_review=true.
- For vitamins and minerals, TRANSCRIBE the measured value and unit exactly as written; do
  not convert units or judge whether a level is "good" or "deficient."
- You are drafting for a dietitian who will ratify. You NEVER set clinical nutrient gaps or
  targets — that is the clinician's job. Record measurements and medical history as written.
- If the document is unreadable or too sparse to extract a name plus any other field, set
  overall_status="insufficient_data".
- Always respond by calling the record_patient_intake tool. Do not write prose."""

# --- Extraction schema (single source of truth for live + mock) -----------------
def _field(value_types: list[str]) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["value", "confidence", "needs_review"],
        "properties": {
            "value": {"type": value_types},
            "confidence": {"type": "number"},
            "needs_review": {"type": "boolean"},
        },
    }


# A measured vitamin/mineral level as transcribed from the intake bloodwork.
_MEASUREMENT_ITEM = {
    "type": "object",
    "additionalProperties": False,
    "required": ["name", "value", "unit", "confidence", "needs_review"],
    "properties": {
        "name": {"type": "string"},
        "value": {"type": ["number", "null"]},
        "unit": {"type": ["string", "null"]},
        "confidence": {"type": "number"},
        "needs_review": {"type": "boolean"},
    },
}


INTAKE_TOOL_SCHEMA = {
    "name": "record_patient_intake",
    "description": "Record the structured patient profile extracted from an intake document.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["name", "age", "gender", "blood_group", "bmi", "vitamins",
                     "minerals", "medical_history", "conditions", "constraints",
                     "overall_status"],
        "properties": {
            "name": _field(["string", "null"]),
            "age": _field(["integer", "null"]),
            "gender": _field(["string", "null"]),
            "blood_group": _field(["string", "null"]),
            "bmi": _field(["number", "null"]),
            "vitamins": {"type": "array", "items": _MEASUREMENT_ITEM},
            "minerals": {"type": "array", "items": _MEASUREMENT_ITEM},
            "medical_history": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["condition", "since", "notes", "confidence", "needs_review"],
                    "properties": {
                        "condition": {"type": "string"},
                        "since": {"type": ["string", "null"]},
                        "notes": {"type": ["string", "null"]},
                        "confidence": {"type": "number"},
                        "needs_review": {"type": "boolean"},
                    },
                },
            },
            "conditions": {"type": "array", "items": {"type": "string"}},
            "constraints": {
                "type": "object",
                "additionalProperties": False,
                "required": ["restrictions", "dislikes", "weekly_budget_usd"],
                "properties": {
                    "restrictions": {"type": "array", "items": {"type": "string"}},
                    "dislikes": {"type": "array", "items": {"type": "string"}},
                    "weekly_budget_usd": {"type": ["number", "null"]},
                },
            },
            "overall_status": {"type": "string", "enum": ["parsed", "insufficient_data"]},
        },
    },
}


# --- Document reading -----------------------------------------------------------
def read_document(path: str) -> dict:
    """Return an Anthropic content block for a .pdf / .txt / .md file.

    .pdf     -> base64 document block (media_type application/pdf), base64 without newlines.
    .txt/.md -> text document block (media_type text/plain).
    """
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        with open(path, "rb") as f:
            data = base64.standard_b64encode(f.read()).decode("ascii")  # no newlines
        return {"type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": data}}
    if ext in (".txt", ".md"):
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        return {"type": "document",
                "source": {"type": "text", "media_type": "text/plain", "data": text}}
    raise ValueError(f"unsupported document type: {ext!r} (want .pdf, .txt, or .md)")


# --- Live extraction (Claude) ---------------------------------------------------
def extract_profile_live(doc_block: dict, *, model: str = DEFAULT_MODEL) -> dict:
    """Call Claude with the document + a forced tool call; return the validated input dict."""
    import anthropic  # lazy: offline mode has no hard dependency on the SDK

    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
    resp = client.messages.create(
        model=model,
        max_tokens=2048,
        system=INTAKE_SYSTEM_PROMPT,
        tools=[INTAKE_TOOL_SCHEMA],
        tool_choice={"type": "tool", "name": "record_patient_intake"},
        messages=[{"role": "user", "content": [
            doc_block,
            {"type": "text", "text": "Extract the patient intake profile using the "
                                     "record_patient_intake tool. Emit needs_review for "
                                     "anything not clearly stated; never invent values."},
        ]}],
    )
    tool_use = next(b for b in resp.content if b.type == "tool_use")
    return tool_use.input


# --- CLI extraction (uses the authenticated `claude` CLI; no API key needed) ----
# A JSON skeleton handed to the model so it returns the exact schema shape.
_JSON_SKELETON = """{
  "name": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
  "age": {"value": <integer|null>, "confidence": <0-1>, "needs_review": <bool>},
  "gender": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
  "blood_group": {"value": <string|null>, "confidence": <0-1>, "needs_review": <bool>},
  "bmi": {"value": <number|null>, "confidence": <0-1>, "needs_review": <bool>},
  "vitamins": [{"name": <string>, "value": <number|null>, "unit": <string|null>, "confidence": <0-1>, "needs_review": <bool>}],
  "minerals": [{"name": <string>, "value": <number|null>, "unit": <string|null>, "confidence": <0-1>, "needs_review": <bool>}],
  "medical_history": [{"condition": <string>, "since": <string|null>, "notes": <string|null>, "confidence": <0-1>, "needs_review": <bool>}],
  "conditions": [<string>],
  "constraints": {"restrictions": [<string>], "dislikes": [<string>], "weekly_budget_usd": <number|null>},
  "overall_status": "parsed" | "insufficient_data"
}"""


def claude_cli_available() -> bool:
    return shutil.which("claude") is not None


def _read_text_for_cli(path: str) -> str:
    """Return document text for the CLI prompt. Reads .txt/.md directly; extracts
    text from a .pdf if pypdf is available (the CLI prompt is text-based)."""
    ext = os.path.splitext(path)[1].lower()
    if ext in (".txt", ".md"):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    if ext == ".pdf":
        try:
            import pypdf  # optional
        except ImportError as e:
            raise RuntimeError("PDF via the CLI backend needs `pypdf`; use the API-key "
                               "path for native PDF vision, or pip install pypdf.") from e
        reader = pypdf.PdfReader(path)
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    raise ValueError(f"unsupported document type: {ext!r}")


def extract_profile_cli(path: str) -> dict:
    """Extract via the authenticated `claude` CLI in headless mode. No API key needed."""
    doc_text = _read_text_for_cli(path)
    prompt = (
        f"{INTAKE_SYSTEM_PROMPT}\n\n"
        "Return ONLY a single JSON object matching EXACTLY this schema "
        "(no prose, no markdown code fences):\n"
        f"{_JSON_SKELETON}\n\n"
        "=== INTAKE DOCUMENT START ===\n"
        f"{doc_text}\n"
        "=== INTAKE DOCUMENT END ==="
    )
    proc = subprocess.run(
        ["claude", "-p", "--output-format", "json"],
        input=prompt, capture_output=True, text=True, timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI failed (exit {proc.returncode}): {proc.stderr[:500]}")
    envelope = json.loads(proc.stdout)          # Claude Code result envelope
    raw = envelope.get("result", proc.stdout)   # the model's text answer
    return _parse_json_answer(raw)


def _parse_json_answer(raw: str) -> dict:
    """Pull a JSON object out of a model text answer (tolerates ```json fences)."""
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.DOTALL).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"no JSON object found in model output: {raw[:200]!r}")
    return json.loads(text[start:end + 1])


# --- Mock extraction (offline, deterministic) -----------------------------------
_BLANK = re.compile(r"^[\s_\-]*$")
_YEAR = re.compile(r"\b((?:19|20)\d{2})\b")


def _labeled(text: str, label: str) -> str | None:
    m = re.search(rf"^{re.escape(label)}\s*:\s*(.*)$", text, re.MULTILINE | re.IGNORECASE)
    return m.group(1).strip() if m else None


def _looks_blank(raw: str | None) -> bool:
    if raw is None:
        return True
    # strip a trailing parenthetical note like "(left blank — confirm at visit)"
    head = re.split(r"\(", raw, maxsplit=1)[0].strip()
    return bool(_BLANK.match(head)) or head.lower() in ("", "n/a", "none", "unknown")


def _f(value, confidence, needs_review):
    return {"value": value, "confidence": confidence, "needs_review": needs_review}


def extract_profile_mock(path: str) -> dict:
    """Deterministic parse of a plain-text intake form. Same schema as the live path."""
    with open(path, "r", encoding="utf-8") as fh:
        text = fh.read()

    # name
    name_raw = _labeled(text, "Patient Name") or _labeled(text, "Name")
    name = _f(name_raw or None, 0.97 if name_raw else 0.0, not name_raw)

    # age (look for "Age: NN" anywhere)
    m_age = re.search(r"Age\s*:?\s*(\d{1,3})", text, re.IGNORECASE)
    age = _f(int(m_age.group(1)), 0.95, False) if m_age else _f(None, 0.0, True)

    # gender
    g_raw = _labeled(text, "Gender") or _labeled(text, "Sex")
    gender = _f(g_raw or None, 0.95 if g_raw else 0.0, not g_raw)

    # blood group (deliberately blank in the dummy -> needs_review)
    bg_raw = _labeled(text, "Blood Group") or _labeled(text, "Blood Type")
    if _looks_blank(bg_raw):
        blood_group = _f(None, 0.0, True)
    else:
        blood_group = _f(bg_raw, 0.9, False)

    # medical history — bullet lines under a MEDICAL HISTORY header
    history = _extract_history(text)

    # active conditions: normalized condition names from history
    conditions = [h["condition"].lower() for h in history]

    # dietary constraints
    restr_raw = _labeled(text, "Dietary restrictions") or _labeled(text, "Restrictions")
    restrictions = _split_list(restr_raw)
    dislikes_raw = _labeled(text, "Foods disliked") or _labeled(text, "Dislikes")
    dislikes = _split_list(dislikes_raw)
    m_budget = re.search(r"budget[^$]*\$\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    budget = float(m_budget.group(1)) if m_budget else None

    # recorded measurements
    m_bmi = re.search(r"BMI\s*:?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    bmi = _f(float(m_bmi.group(1)), 0.95, False) if m_bmi else _f(None, 0.0, True)
    vitamins = [_parse_measure(b) for b in _bullets_after(text, "Vitamins")]
    minerals = [_parse_measure(b) for b in _bullets_after(text, "Minerals")]

    parsed_ok = bool(name_raw) and (age["value"] is not None or history)
    return {
        "name": name,
        "age": age,
        "gender": gender,
        "blood_group": blood_group,
        "bmi": bmi,
        "vitamins": vitamins,
        "minerals": minerals,
        "medical_history": history,
        "conditions": conditions,
        "constraints": {"restrictions": restrictions, "dislikes": dislikes,
                        "weekly_budget_usd": budget},
        "overall_status": "parsed" if parsed_ok else "insufficient_data",
    }


def _bullets_after(text: str, label: str) -> list[str]:
    """Return bullet-line bodies under a 'Label:' sub-heading (stops at the next
    non-bullet line, e.g. the following sub-heading or a section separator)."""
    out: list[str] = []
    capturing = False
    for line in text.splitlines():
        s = line.strip()
        if re.match(rf"^{re.escape(label)}\s*:?\s*$", s, re.IGNORECASE):
            capturing = True
            continue
        if capturing:
            if s.startswith("-"):
                out.append(s.lstrip("-").strip())
            elif s == "":
                continue
            else:
                break
    return out


def _parse_measure(body: str) -> dict:
    """Parse 'Vitamin D:  22 ng/mL (flagged low)' -> measurement item. Blank/illegible
    values (e.g. '____') yield value=null + needs_review, never a guessed number."""
    name, _, rest = body.partition(":")
    name = name.strip()
    rest = re.sub(r"\(.*?\)", "", rest).strip()          # drop parenthetical notes
    m = re.search(r"(-?\d+(?:\.\d+)?)\s*([^\s()]+)?", rest)
    if not m:
        return {"name": name, "value": None, "unit": None,
                "confidence": 0.0, "needs_review": True}
    unit = m.group(2)
    return {"name": name, "value": float(m.group(1)), "unit": unit or None,
            "confidence": 0.9, "needs_review": False}


def _extract_history(text: str) -> list[dict]:
    """Pull bullet lines under a 'MEDICAL HISTORY' heading into structured items."""
    # skip the header line and an optional dashed/`=` separator line beneath it,
    # then capture up to the next separator line or end of document.
    m = re.search(r"MEDICAL HISTORY[^\n]*\n(?:[-=]{3,}[^\n]*\n)?(.*?)(?:\n[-=]{3,}|\Z)",
                  text, re.IGNORECASE | re.DOTALL)
    if not m:
        return []
    items = []
    for line in m.group(1).splitlines():
        line = line.strip()
        if not line.startswith("-"):
            continue
        body = line.lstrip("-").strip()
        if not body:
            continue
        condition = re.split(r"[,.]", body, maxsplit=1)[0].strip()
        since = None
        my = _YEAR.search(body)
        if my:
            since = my.group(1)
        notes = body[len(condition):].lstrip(" ,.").strip() or None
        items.append({"condition": condition, "since": since, "notes": notes,
                      "confidence": 0.9, "needs_review": False})
    return items


def _split_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    # strip parenthetical clarifications, split on commas / "and"
    raw = re.sub(r"\(.*?\)", "", raw)
    parts = re.split(r",|\band\b", raw)
    return [p.strip() for p in parts if p.strip()]


# --- Dispatcher -----------------------------------------------------------------
def _backend() -> str:
    """Pick an extraction backend:
      "mock" — forced via SMART_SAVOR_MOCK_INTAKE=1 (offline, deterministic).
      "live" — ANTHROPIC_API_KEY set (Anthropic SDK, native PDF vision).
      "cli"  — authenticated `claude` CLI available (no API key needed).
      else   — "mock" fallback.
    """
    if os.getenv("SMART_SAVOR_MOCK_INTAKE") == "1":
        return "mock"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "live"
    if os.getenv("SMART_SAVOR_NO_CLI") != "1" and claude_cli_available():
        return "cli"
    return "mock"


def extract_profile(path: str, *, model: str = DEFAULT_MODEL) -> tuple[dict, str]:
    """Extract a profile from `path`. Returns (extracted_schema_dict, mode)."""
    backend = _backend()
    if backend == "live":
        return extract_profile_live(read_document(path), model=model), "live"
    if backend == "cli":
        return extract_profile_cli(path), "cli"
    return extract_profile_mock(path), "mock"


# --- Map extraction -> store shape ----------------------------------------------
def to_store_profile(extracted: dict) -> dict:
    """Map the {value, confidence, needs_review} schema into the flat store profile,
    preserving needs_review as a `review_fields` list and per-history `flag`s."""
    review_fields: list[str] = []
    flat: dict = {}

    for key in ("name", "age", "gender", "blood_group", "bmi"):
        cell = extracted.get(key) or {}
        value = cell.get("value")
        if key == "gender" and isinstance(value, str):
            value = value.lower()
        flat[key] = value
        if cell.get("needs_review"):
            review_fields.append(key)

    # measured vitamin / mineral levels — transcribed, not interpreted
    for group in ("vitamins", "minerals"):
        items = []
        for i, m in enumerate(extracted.get(group, [])):
            flag = "needs_review" if m.get("needs_review") else "ok"
            items.append({"name": m["name"], "value": m.get("value"),
                          "unit": m.get("unit"), "flag": flag})
            if m.get("needs_review"):
                review_fields.append(f"{group}[{i}] ({m.get('name')})")
        flat[group] = items

    history = []
    for i, h in enumerate(extracted.get("medical_history", [])):
        flag = "needs_review" if h.get("needs_review") else "ok"
        history.append({"condition": h["condition"], "since": h.get("since"),
                        "notes": h.get("notes"), "flag": flag})
        if h.get("needs_review"):
            review_fields.append(f"medical_history[{i}]")
    flat["medical_history"] = history

    flat["conditions"] = list(extracted.get("conditions", []))
    flat["constraints"] = dict(extracted.get("constraints", {}))
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
