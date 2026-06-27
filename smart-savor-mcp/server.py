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
    """Return the patient's name, conditions, and constraints (restrictions, dislikes, budget)."""
    p = store.get_patient(patient_id)
    if not p:
        return {"error": f"unknown patient_id: {patient_id}"}
    return {
        "patient_id": p["patient_id"],
        "name": p["name"],
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


if __name__ == "__main__":
    mcp.run()
