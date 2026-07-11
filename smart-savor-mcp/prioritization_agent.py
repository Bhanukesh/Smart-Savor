"""Agent 3 — Cycle Prioritization Agent.

Turns the dietitian's flagged lab deficiencies into a confirmed 6–10 focus set for the
3-month cycle, weighing clinical severity x condition-relevance x synergy/conflict. It
DRAFTS a ranked focus set (with a one-line `why` per pick); the dietitian confirms/overrides
(screen D1.5). It never invents gaps — it only prioritizes the ones the clinician flagged.

Deterministic rules core (auditable + testable). The production agent runs this reasoning
on Opus; the ranking logic here mirrors that prompt's factors.
"""

from __future__ import annotations

import store

_SEVERITY = {"severe": 3, "moderate": 2, "mild": 1}

# condition -> nutrients that are especially relevant to it
_CONDITION_NUTRIENTS = {
    "type-2 diabetes": {"magnesium", "fiber", "chromium"},
    "type 2 diabetes": {"magnesium", "fiber", "chromium"},
    "hypertension": {"potassium", "sodium", "magnesium"},
    "cardiovascular risk": {"fiber", "potassium", "magnesium"},
    "chronic kidney disease": {"potassium", "phosphorus"},
    "anemia": {"iron", "folate", "vitamin_b12"},
}
_SYNERGY = {("iron", "vitamin_c")}   # vitamin C boosts iron absorption -> pull in together
_CONFLICT = {("calcium", "iron")}    # calcium competes with iron -> defer one


def _patient_conditions(p: dict) -> list[str]:
    conds = [c.lower() for c in p.get("conditions", [])]
    conds += [m["condition"].lower() for m in p.get("medical_history", [])]
    return conds


def prioritize(patient_id: str, max_focus: int = 10) -> dict:
    """Rank flagged gaps into a focus set; persist it; return the draft for D1.5."""
    p = store.get_patient(patient_id)
    if not p:
        return {"error": f"unknown patient_id: {patient_id}"}
    gaps = p.get("flagged_gaps", [])
    conds = _patient_conditions(p)
    relevant = set().union(*(_CONDITION_NUTRIENTS.get(c, set()) for c in conds)) if conds else set()
    present = {g["nutrient"] for g in gaps}

    scored = []
    for g in gaps:
        n = g["nutrient"]
        sev = g.get("severity", "moderate")
        score = _SEVERITY.get(sev, 2) * 10
        why = [f"{sev} deficiency ({g['current']}→{g['target']} {g.get('unit', '')})"]
        pair = conflict = None
        if n in relevant:
            score += 5
            why.append("condition-relevant")
        for a, b in _SYNERGY:
            if n == a and b in present:
                pair = b; score += 3; why.append(f"pair with {b} (absorption synergy)")
            elif n == b and a in present:
                pair = a; score += 1
        for a, b in _CONFLICT:
            if n == a and b in present:      # calcium present with iron -> defer calcium
                conflict = b; score -= 3; why.append(f"defer vs {b} (competes)")
            elif n == b and a in present:
                conflict = a
        scored.append({"nutrient": n, "score": score, "why": "; ".join(why),
                       "pair_with": pair, "conflicts_with": conflict})

    scored.sort(key=lambda x: -x["score"])
    focus = scored[:max_focus]
    for i, f in enumerate(focus, 1):
        f["rank"] = i

    store.save_focus_set(patient_id, [
        {"nutrient": f["nutrient"], "why": f["why"], "pair_with": f["pair_with"], "rank": f["rank"]}
        for f in focus
    ])
    return {"focus_set": focus, "deferred": scored[max_focus:], "count": len(focus),
            "capacity_note": f"{len(focus)}/{max_focus} focus items (behavior-change ceiling)",
            "notes_for_dietitian": "Draft for confirmation in D1.5 — approve or override."}
