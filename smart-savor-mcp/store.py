"""In-memory seed store for the Smart Savor Health & Pantry Profile MCP.

Scaffold only. In production this is PostgreSQL (+ pgvector) and the pre-computed
Walmart x USDA price x nutrient join. Here we seed one patient and a tiny slice of
the reference table so the MCP runs end-to-end for the demo.

Reference-table rows carry REAL-shaped fields: price (USD) and nutrient amount per
serving. `cost_per_unit_nutrient` is derived (price / nutrient_per_serving) so the
Gap Resolver can rank by it.
"""

from __future__ import annotations

# --- Price x Nutrient reference table (stitched join, pre-computed) -------------
# Each row: a food, its price, and how much of a given nutrient one serving provides.
# unit = mg unless noted. This is the headline asset the custom MCP serves.
REFERENCE_TABLE = [
    # nutrient   food            fdc_id   price   serving      amount  unit
    {"nutrient": "iron",      "food": "White rice",   "fdc_id": "169756", "price": 0.36, "serving": "1 cup",  "amount": 1.9,  "unit": "mg"},
    {"nutrient": "iron",      "food": "Lentils",      "fdc_id": "172420", "price": 0.18, "serving": "1 cup",  "amount": 6.6,  "unit": "mg"},
    {"nutrient": "iron",      "food": "Spinach",      "fdc_id": "168462", "price": 0.50, "serving": "1 cup",  "amount": 6.4,  "unit": "mg"},
    {"nutrient": "iron",      "food": "Tofu",         "fdc_id": "172475", "price": 0.45, "serving": "1/2 cup","amount": 3.4,  "unit": "mg"},
    {"nutrient": "vitamin_c", "food": "Banana",       "fdc_id": "173944", "price": 0.25, "serving": "1 med",  "amount": 10.3, "unit": "mg"},
    {"nutrient": "vitamin_c", "food": "Orange",       "fdc_id": "169097", "price": 0.40, "serving": "1 med",  "amount": 70.0, "unit": "mg"},
    {"nutrient": "vitamin_c", "food": "Bell pepper",  "fdc_id": "170108", "price": 0.60, "serving": "1 med",  "amount": 95.7, "unit": "mg"},
    {"nutrient": "magnesium", "food": "White rice",   "fdc_id": "169756", "price": 0.36, "serving": "1 cup",  "amount": 19.0, "unit": "mg"},
    {"nutrient": "magnesium", "food": "Brown rice",   "fdc_id": "169704", "price": 0.42, "serving": "1 cup",  "amount": 84.0, "unit": "mg"},
]


def _with_derived(row: dict) -> dict:
    """Attach cost_per_unit_nutrient = price / amount (USD per mg)."""
    out = dict(row)
    out["cost_per_unit_nutrient"] = round(row["price"] / row["amount"], 4) if row["amount"] else None
    return out


# --- Patients (seeded for the demo) ---------------------------------------------
PATIENTS = {
    "sam-rivera": {
        "patient_id": "sam-rivera",
        "name": "Sam Rivera",
        # demographics + history are auto-filled by the Patient Intake Ingestion Agent
        # from an intake document, then ratified by the dietitian.
        "age": 54,
        "gender": "male",
        "blood_group": "O+",
        "bmi": 28.6,
        # measured levels transcribed from intake bloodwork (not clinician-set targets)
        "vitamins": [
            {"name": "Vitamin D", "value": 24.0, "unit": "ng/mL", "flag": "ok"},
            {"name": "Vitamin B12", "value": 380.0, "unit": "pg/mL", "flag": "ok"},
        ],
        "minerals": [
            {"name": "Iron (serum)", "value": 55.0, "unit": "ug/dL", "flag": "ok"},
            {"name": "Magnesium", "value": 1.8, "unit": "mg/dL", "flag": "ok"},
        ],
        "medical_history": [
            {"condition": "type-2 diabetes", "since": "2019", "notes": "diet-managed", "flag": "ok"},
            {"condition": "hypertension",    "since": "2021", "notes": None,           "flag": "ok"},
        ],
        "conditions": ["type-2 diabetes"],
        "constraints": {
            "restrictions": ["vegetarian"],
            "dislikes": ["mushrooms"],
            "weekly_budget_usd": 40.0,
        },
        # flagged by the dietitian from the latest lab (agent never sets these)
        "flagged_gaps": [
            {"nutrient": "iron",      "current": 9.0,  "target": 18.0, "unit": "mg", "severity": "severe"},
            {"nutrient": "vitamin_c", "current": 40.0, "target": 90.0, "unit": "mg", "severity": "moderate"},
            {"nutrient": "magnesium", "current": 300.0,"target": 420.0,"unit": "mg", "severity": "moderate"},
        ],
        # what Sam actually buys, learned from receipts (purchase frequency / week)
        "habit_model": {
            "White rice": {"freq_per_week": 5, "last_seen": "2026-06-24"},
            "Banana":     {"freq_per_week": 7, "last_seen": "2026-06-24"},
            "Lentils":    {"freq_per_week": 1, "last_seen": "2026-06-10"},
        },
        "cycle": {
            "cycle_id": "sam-2026q2",
            "start": "2026-04-02",
            "retest_due": "2026-07-02",
            "focus_set": [],  # filled when the dietitian confirms in D1.5
        },
    }
}


# --- Accessors used by the MCP tools --------------------------------------------
def get_patient(patient_id: str) -> dict | None:
    return PATIENTS.get(patient_id)


# Fields the Patient Intake Ingestion Agent is allowed to write. Deliberately
# EXCLUDES flagged_gaps (clinician-owned), habit_model (Receipt Ingestion Agent),
# and cycle (Prioritization / Orchestrator) — the intake agent must never touch them.
_INTAKE_WRITABLE = ("name", "age", "gender", "blood_group", "bmi", "vitamins",
                    "minerals", "medical_history", "conditions", "constraints")


def _empty_patient(patient_id: str) -> dict:
    """A skeleton patient with the canonical schema keys and safe empty clinician fields."""
    return {
        "patient_id": patient_id,
        "name": None,
        "age": None,
        "gender": None,
        "blood_group": None,
        "bmi": None,
        "vitamins": [],   # measured levels transcribed from intake bloodwork
        "minerals": [],   # measured levels transcribed from intake bloodwork
        "medical_history": [],
        "conditions": [],
        "constraints": {"restrictions": [], "dislikes": [], "weekly_budget_usd": None},
        "flagged_gaps": [],   # clinician-only; intake agent never fills this
        "habit_model": {},    # Receipt Ingestion Agent territory
        "cycle": {"cycle_id": None, "start": None, "retest_due": None, "focus_set": []},
    }


def upsert_patient(patient_id: str, profile: dict) -> dict:
    """Create or merge a patient from extracted intake data.

    Writes ONLY demographic / medical-history / constraint fields present in `profile`
    (see `_INTAKE_WRITABLE`). Never touches flagged_gaps, habit_model, or cycle, so the
    "agent drafts, dietitian ratifies" and clinician-owns-gaps contracts hold.

    `profile` may carry a "review_fields" list (fields the extractor marked needs_review);
    it is echoed back but not stored as patient data.

    Returns {created, patient_id, written_fields, review_fields}.
    """
    created = patient_id not in PATIENTS
    if created:
        PATIENTS[patient_id] = _empty_patient(patient_id)
    p = PATIENTS[patient_id]

    written: list[str] = []
    for key in _INTAKE_WRITABLE:
        if key not in profile or profile[key] is None:
            continue
        if key == "constraints":
            # merge sub-keys rather than clobbering the whole constraints object
            incoming = profile["constraints"] or {}
            for sub in ("restrictions", "dislikes", "weekly_budget_usd"):
                if sub in incoming and incoming[sub] is not None:
                    p["constraints"][sub] = incoming[sub]
            written.append("constraints")
        else:
            p[key] = profile[key]
            written.append(key)

    review_fields = list(profile.get("review_fields", []))
    return {
        "created": created,
        "patient_id": patient_id,
        "written_fields": written,
        "review_fields": review_fields,
    }


def query_reference(nutrient: str, exclude: list[str] | None = None,
                    sort_by: str = "gap_efficiency", max_cost_per_unit: float | None = None,
                    limit: int = 5) -> list[dict]:
    """Foods that supply `nutrient`.

    sort_by:
      "gap_efficiency" (default) — most nutrient per serving first (closes the gap fastest).
      "cost"                     — cheapest cost-per-unit-nutrient first (optional B2C/affordability view).

    Price is an OPTIONAL signal in B2B v1: `max_cost_per_unit` is NOT applied unless the
    caller passes it. cost_per_unit_nutrient is always returned so the UI can show/sort by it.
    """
    exclude = {e.lower() for e in (exclude or [])}
    rows = [_with_derived(r) for r in REFERENCE_TABLE if r["nutrient"] == nutrient]
    rows = [r for r in rows if r["food"].lower() not in exclude]
    # price is opt-in, never enforced unless explicitly requested
    if max_cost_per_unit is not None:
        rows = [r for r in rows if r["cost_per_unit_nutrient"] is not None
                and r["cost_per_unit_nutrient"] <= max_cost_per_unit]
    if sort_by == "cost":
        rows.sort(key=lambda r: (r["cost_per_unit_nutrient"] is None, r["cost_per_unit_nutrient"]))
    else:  # gap_efficiency: most nutrient per serving first
        rows.sort(key=lambda r: r["amount"], reverse=True)
    return rows[:limit]


def save_focus_set(patient_id: str, focus_set: list[dict]) -> bool:
    p = PATIENTS.get(patient_id)
    if not p:
        return False
    p["cycle"]["focus_set"] = focus_set
    return True


def log_intake(patient_id: str, item: str, freq_per_week: float, date: str) -> bool:
    p = PATIENTS.get(patient_id)
    if not p:
        return False
    p["habit_model"][item] = {"freq_per_week": freq_per_week, "last_seen": date}
    return True
