"""Agent 4 — Swap Sourcing & Approved-List Drafting Agent (wraps Skill B). THE USP engine.

Two modes:
  draft_list(patient_id, nutrient) — draft a comorbidity-screened menu of gap-closing
      foods, ranked by gap-closing efficiency then minimal disruption (cost optional,
      never enforced). Restriction violations are hard-EXCLUDED; comorbidity concerns are
      FLAGGED for the dietitian.
  ratify_list(...) — the dietitian approves/adjusts; persists the ratified menu.
  patient_choice(patient_id, nutrient, food) — THE USP: the patient picks any approved
      food, and the agent recomputes the AMOUNT (Y = ceil(gap / nutrient-per-serving)) so
      the same target is still closed and the plan stays "approved".
"""

from __future__ import annotations

import math

import skills
import store


def _gap(p: dict, nutrient: str) -> dict | None:
    return next((g for g in p.get("flagged_gaps", []) if g["nutrient"] == nutrient), None)


def draft_list(patient_id: str, nutrient: str, limit: int = 3) -> dict:
    """Draft a ratifiable, comorbidity-screened swap menu for one gap."""
    p = store.get_patient(patient_id)
    gap = _gap(p, nutrient) if p else None
    if not gap:
        return {"error": f"no flagged gap for {nutrient}"}
    gap_size = gap["target"] - gap["current"]
    cons = p.get("constraints", {})
    conditions = list(p.get("conditions", [])) + [m["condition"] for m in p.get("medical_history", [])]
    res = skills.gap_resolver(
        nutrient, gap_size, habit_model=p.get("habit_model", {}),
        restrictions=cons.get("restrictions"), dislikes=cons.get("dislikes"),
        conditions=conditions, limit=limit)
    return {"nutrient": nutrient, "gap_size": gap_size, "gap_unit": gap.get("unit"),
            "menu": res["candidates"], "status": res["status"]}


def ratify_list(patient_id: str, nutrient: str, menu: list[dict]) -> dict:
    """Dietitian ratifies the draft (approve/adjust) -> persist the approved menu."""
    store.save_approved_list(patient_id, nutrient, menu)
    return {"ratified": True, "nutrient": nutrient, "count": len(menu)}


def patient_choice(patient_id: str, nutrient: str, food: str) -> dict:
    """THE USP: patient picks an approved food; agent recomputes the amount to still
    close the same target, and confirms it stays within the dietitian's approved plan."""
    p = store.get_patient(patient_id)
    approved = store.get_approved_list(patient_id, nutrient)
    gap = _gap(p, nutrient) if p else None
    if not gap:
        return {"error": f"no flagged gap for {nutrient}"}
    gap_size = gap["target"] - gap["current"]
    chosen = next((c for c in approved
                   if c["food"] == food or food.lower() in c["food"].lower()), None)
    if not chosen:
        return {"error": f"'{food}' is not on the approved list for {nutrient}",
                "approved_options": [c["food"] for c in approved]}
    amount = chosen["amount_per_serving"]
    servings = math.ceil(gap_size / amount) if amount else None
    choice = {"nutrient": nutrient, "food": chosen["food"], "serving": chosen["serving"],
              "amount_per_serving": amount, "unit": chosen["unit"],
              "servings_per_week": servings, "closes_gap": gap_size,
              "still_approved": True,
              "message": f"~{servings} serving(s) of {chosen['food'].split(',')[0]} "
                         f"({chosen['serving']}) closes your {gap_size} {chosen['unit']} "
                         f"{nutrient} gap — still within your dietitian's approved plan."}
    store.save_patient_choice(patient_id, choice)
    return choice
