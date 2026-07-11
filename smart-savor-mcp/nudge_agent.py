"""Agent 5 — Nudge / Adherence Agent.

Reconciles the PURCHASE signal (habit model) against the CONSUMPTION signal (logs) and
sends ONE gentle weekly (never daily) nudge on a gap-relevant food the patient BOUGHT but
hasn't LOGGED — tying that exact food to the clinical goal. Code owns the trigger (set
difference, narrowed to gap-relevant foods) and the weekly cadence; framed as help,
not surveillance.
"""

from __future__ import annotations

import skills
import store


def _logged_tokens(p: dict) -> set[str]:
    toks: set[str] = set()
    for e in p.get("consumption_events", []):
        toks |= skills._tokens(e.get("item", ""))
    return toks


def bought_not_logged(patient_id: str) -> list[dict]:
    """Gap-relevant foods the patient purchased but hasn't logged this week."""
    p = store.get_patient(patient_id)
    if not p:
        return []
    logged = _logged_tokens(p)
    approved = {c["food"]: nut for nut, items in p.get("approved_lists", {}).items()
                for c in items}
    out = []
    for food in p.get("habit_model", {}):
        ftoks = skills._tokens(food)
        if ftoks & logged:            # already logged (any token overlap) -> skip
            continue
        for af, nut in approved.items():
            if skills._tokens(af) & ftoks:     # gap-relevant (matches an approved food)
                out.append({"food": food, "nutrient": nut})
                break
    return out


def weekly_nudge(patient_id: str) -> dict:
    """Send at most one weekly nudge on a bought-but-not-logged gap food."""
    candidates = bought_not_logged(patient_id)
    if not candidates:
        return {"nudge": None, "reason": "no bought-but-not-logged gap food this week"}
    top = candidates[0]
    food_short = top["food"].split(",")[0]
    msg = (f"Hi Sam — I noticed you picked up {food_short.lower()} recently but it hasn't "
           f"shown up in your log. It's one of your fastest ways to close your "
           f"{top['nutrient']} gap — did you get to have it this week?")
    nudge = {"food": top["food"], "nutrient": top["nutrient"], "message": msg,
             "cadence": "weekly"}
    store.add_nudge(patient_id, nudge)
    return {"nudge": nudge, "bought_not_logged": [c["food"] for c in candidates]}
