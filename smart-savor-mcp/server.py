"""Smart Savor — Health & Pantry Profile MCP (custom, Bar 3).

The bespoke source. It stores the patient's flagged gaps, constraints, dislikes,
budget, and logged intake — AND serves the stitched price x nutrient reference table
that lets nutrients attach to price.

Run (stdio):  python server.py
Then register in an MCP client / the Agent SDK runner.

Scaffold: backed by the in-memory seed store in store.py. Swap store.py for the
Postgres + pre-computed join in production; the tool surface stays the same.
"""

from mcp.server.fastmcp import FastMCP

import store

mcp = FastMCP("smart-savor-health-pantry")


# --- Profile / cycle reads ------------------------------------------------------
@mcp.tool()
def get_patient_profile(patient_id: str) -> dict:
    """Return the patient's demographics, vitals, lab results, history, and constraints.

    Demographics, vitals, and lab_results/other_analytes are auto-filled by the Patient
    Intake Ingestion Agent (via save_patient_intake) from the health report, so the
    dietitian can read back what was extracted.
    """
    p = store.get_patient(patient_id)
    if not p:
        return {"error": f"unknown patient_id: {patient_id}"}
    return {
        "patient_id": p["patient_id"],
        "name": p["name"],
        "age": p.get("age"),
        "gender": p.get("gender"),
        "date_of_birth": p.get("date_of_birth"),
        "blood_group": p.get("blood_group"),
        "bmi": p.get("bmi"),
        "blood_pressure": p.get("blood_pressure"),
        "report_meta": p.get("report_meta"),
        "lab_results": p.get("lab_results", []),
        "other_analytes": p.get("other_analytes", []),
        "medical_history": p.get("medical_history", []),
        "conditions": p["conditions"],
        "constraints": p["constraints"],
    }


@mcp.tool()
def get_flagged_gaps(patient_id: str) -> dict:
    """Return the nutrient gaps the dietitian flagged from the latest lab.

    The agent NEVER sets these — they are clinician-entered. Used by the Cycle
    Prioritization Agent to draft a focus set.
    """
    p = store.get_patient(patient_id)
    if not p:
        return {"error": f"unknown patient_id: {patient_id}"}
    return {"patient_id": patient_id, "flagged_gaps": p["flagged_gaps"]}


@mcp.tool()
def get_habit_model(patient_id: str) -> dict:
    """Return what the patient actually buys, learned from receipts (purchase frequency)."""
    p = store.get_patient(patient_id)
    if not p:
        return {"error": f"unknown patient_id: {patient_id}"}
    return {"patient_id": patient_id, "habit_model": p["habit_model"]}


@mcp.tool()
def get_cycle(patient_id: str) -> dict:
    """Return the active 3-month cycle: start, re-test date, and confirmed focus set."""
    p = store.get_patient(patient_id)
    if not p:
        return {"error": f"unknown patient_id: {patient_id}"}
    return {"patient_id": patient_id, "cycle": p["cycle"]}


# --- The headline asset: price x nutrient reference table -----------------------
@mcp.tool()
def query_nutrient_sources(nutrient: str, exclude: list[str] | None = None,
                           sort_by: str = "gap_efficiency",
                           max_cost_per_unit: float | None = None, limit: int = 5) -> dict:
    """Foods that supply `nutrient`, from the stitched USDA-nutrient (x Walmart-price) join.

    B2B v1: ranked by GAP-CLOSING EFFICIENCY (most nutrient per serving) by default. The
    Swap Sourcing Agent then applies minimal-disruption using the patient's habit model.
    Price is an OPTIONAL signal — pass sort_by="cost" to rank by affordability (B2C path),
    and max_cost_per_unit only if the caller wants a hard ceiling (not enforced by default).

    Args:
        nutrient: e.g. "iron", "vitamin_c", "magnesium".
        exclude: food names to drop (dislikes / restriction violations).
        sort_by: "gap_efficiency" (default) or "cost".
        max_cost_per_unit: optional ceiling on USD per unit; omit to ignore price.
        limit: max rows.
    """
    rows = store.query_reference(nutrient, exclude=exclude, sort_by=sort_by,
                                 max_cost_per_unit=max_cost_per_unit, limit=limit)
    return {"nutrient": nutrient, "sort_by": sort_by, "results": rows, "count": len(rows)}


# --- Writes ---------------------------------------------------------------------
@mcp.tool()
def save_focus_set(patient_id: str, focus_set: list[dict]) -> dict:
    """Persist the dietitian-confirmed 6-10 focus deficiencies for the cycle (from D1.5)."""
    ok = store.save_focus_set(patient_id, focus_set)
    return {"saved": ok, "patient_id": patient_id, "count": len(focus_set)}


@mcp.tool()
def log_intake(patient_id: str, item: str, freq_per_week: float, date: str) -> dict:
    """Update the habit model with a newly observed item (from a receipt or manual log)."""
    ok = store.log_intake(patient_id, item, freq_per_week, date)
    return {"logged": ok, "patient_id": patient_id, "item": item}


# --- Agent 2 (Ingestion): consumption events -------------------------------------
@mcp.tool()
def add_consumption_event(patient_id: str, event: dict) -> dict:
    """Record a CONSUMPTION event from a food log: {item, date, source, confidence}.

    Distinct from log_intake (purchase signal, from receipts). Confidence reflects
    how the event was captured: photo > nudge-confirmed > inferred.
    """
    ok = store.add_consumption_event(patient_id, event)
    return {"logged": ok, "patient_id": patient_id, "event": event}


# --- Agent 4 (Swap Sourcing): approved lists + patient choices -------------------
@mcp.tool()
def save_approved_list(patient_id: str, nutrient: str, items: list[dict]) -> dict:
    """Persist the dietitian-ratified approved swap menu for a nutrient gap.

    Written only after the dietitian ratifies the agent-drafted menu (D2/D3) — the
    patient never sees an unratified list.
    """
    ok = store.save_approved_list(patient_id, nutrient, items)
    return {"saved": ok, "patient_id": patient_id, "nutrient": nutrient, "count": len(items)}


@mcp.tool()
def get_approved_list(patient_id: str, nutrient: str) -> dict:
    """Return the dietitian-ratified approved swap menu for a nutrient gap."""
    items = store.get_approved_list(patient_id, nutrient)
    return {"patient_id": patient_id, "nutrient": nutrient, "items": items}


@mcp.tool()
def save_patient_choice(patient_id: str, choice: dict) -> dict:
    """Record the food the patient picked from the ratified menu + the recomputed
    amount (the USP moment): Y = target / nutrient-per-serving.
    """
    ok = store.save_patient_choice(patient_id, choice)
    return {"saved": ok, "patient_id": patient_id, "choice": choice}


# --- Agent 5 (Nudge) --------------------------------------------------------------
@mcp.tool()
def add_nudge(patient_id: str, nudge: dict) -> dict:
    """Record a weekly adherence nudge sent for a bought-but-not-logged gap food."""
    ok = store.add_nudge(patient_id, nudge)
    return {"saved": ok, "patient_id": patient_id, "nudge": nudge}


@mcp.tool()
def save_patient_intake(patient_id: str, profile: dict) -> dict:
    """Persist a demographics + medical-history + constraints profile drafted by the
    Patient Intake Ingestion Agent from an intake document.

    Creates the patient if new, else merges. NEVER sets flagged_gaps (clinician-owned),
    habit_model, or cycle. Fields the extractor marked low-confidence are surfaced in
    `review_fields` for the dietitian to ratify before they are treated as clinical truth.
    """
    result = store.upsert_patient(patient_id, profile)
    return {"saved": True, **result}


if __name__ == "__main__":
    mcp.run()
