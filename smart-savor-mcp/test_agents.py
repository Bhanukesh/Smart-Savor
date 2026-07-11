"""Tests for Agents 2–5, the shared Skills, and the real reference table.

All offline/deterministic — no API key. Run:  pytest test_agents.py
"""

import os

import ingestion_agent
import nudge_agent
import prioritization_agent as prio
import reference
import skills
import store
import swap_sourcing_agent as swap

_D = os.path.dirname(__file__)


def sp(name: str) -> str:
    return os.path.join(_D, "sample_data", name)


def _new_patient(pid, **fields):
    store.PATIENTS.pop(pid, None)
    store.upsert_patient(pid, {"name": "Test", **fields})
    return store.get_patient(pid)


# --- reference table -----------------------------------------------------------
def test_reference_loads_and_is_plausible():
    assert reference.available()
    rows = store.query_reference("iron", limit=5)
    assert rows
    assert all(r["amount"] <= reference.MAX_PER_SERVING["iron"] for r in rows)  # caps hold
    assert all(r["amount"] > 0 and r["serving"] for r in rows)


# --- skills --------------------------------------------------------------------
def test_skill_evals_all_pass():
    res = skills.run_skill_evals()
    assert all(x["pass"] for v in (res["food_matcher"], res["gap_resolver"]) for x in v)


def test_food_matcher_resolves_and_rejects():
    assert skills.food_matcher("Goya Red Kidney Beans")["matched"]
    assert not skills.food_matcher("paper towels")["matched"]


def test_gap_resolver_respects_vegetarian():
    r = skills.gap_resolver("iron", 9.0, restrictions=["vegetarian"])
    assert r["candidates"]
    assert all("oyster" not in c["food"].lower() for c in r["candidates"])


# --- Agent 2 — Ingestion -------------------------------------------------------
def test_agent2_receipt_and_log():
    _new_patient("t2")
    r = ingestion_agent.ingest_receipt(sp("sam_receipt.txt"), "t2")
    assert r["matched"] >= 4
    assert any("towel" in s.lower() for s in r["skipped_nonfood"])   # non-food skipped
    lg = ingestion_agent.ingest_log(sp("sam_log.txt"), "t2")
    assert lg["count"] == 3
    p = store.get_patient("t2")
    assert p["habit_model"] and p["consumption_events"]


# --- Agent 3 — Prioritization --------------------------------------------------
def test_agent3_ranks_iron_first_and_pairs_vitc():
    p = _new_patient("t3", conditions=["type-2 diabetes"])
    p["flagged_gaps"] = [
        {"nutrient": "iron", "current": 9, "target": 18, "unit": "mg", "severity": "severe"},
        {"nutrient": "vitamin_c", "current": 40, "target": 90, "unit": "mg", "severity": "moderate"},
        {"nutrient": "magnesium", "current": 300, "target": 420, "unit": "mg", "severity": "moderate"},
    ]
    r = prio.prioritize("t3")
    order = [f["nutrient"] for f in r["focus_set"]]
    assert order[0] == "iron"                       # severe + synergy ranks first
    assert r["focus_set"][0]["pair_with"] == "vitamin_c"
    assert store.get_patient("t3")["cycle"]["focus_set"]   # persisted for D1.5


# --- Agent 4 — Swap Sourcing / USP ---------------------------------------------
def _iron_patient(pid, restrictions):
    p = _new_patient(pid, conditions=["type-2 diabetes"],
                     constraints={"restrictions": restrictions, "dislikes": [],
                                  "weekly_budget_usd": None})
    p["flagged_gaps"] = [{"nutrient": "iron", "current": 9, "target": 18,
                          "unit": "mg", "severity": "severe"}]
    return p


def test_agent4_draft_ratify_and_patient_choice():
    _iron_patient("t4", ["vegetarian"])
    d = swap.draft_list("t4", "iron", limit=3)
    assert d["status"] == "ok" and d["menu"]
    assert all("oyster" not in c["food"].lower() for c in d["menu"])   # veg hard-exclude
    swap.ratify_list("t4", "iron", d["menu"])
    ch = swap.patient_choice("t4", "iron", d["menu"][0]["food"])
    assert ch["still_approved"] is True
    assert ch["servings_per_week"] >= 1
    assert store.get_patient("t4")["patient_choices"]


def test_agent4_rejects_unapproved_choice():
    _iron_patient("t4b", [])
    d = swap.draft_list("t4b", "iron")
    swap.ratify_list("t4b", "iron", d["menu"])
    r = swap.patient_choice("t4b", "iron", "Nonexistent Food XYZ")
    assert "error" in r


# --- Agent 5 — Nudge -----------------------------------------------------------
def test_agent5_nudges_bought_not_logged_then_stops_when_logged():
    _iron_patient("t5", [])
    d = swap.draft_list("t5", "iron")
    swap.ratify_list("t5", "iron", d["menu"])
    bought = d["menu"][0]["food"]
    store.log_intake("t5", bought, 1.0, "2026-06-28")     # purchased, not yet logged

    n = nudge_agent.weekly_nudge("t5")
    assert n["nudge"] and n["nudge"]["nutrient"] == "iron"

    store.add_consumption_event("t5", {"item": bought, "date": "2026-06-30",
                                       "source": "text", "confidence": "text"})
    assert nudge_agent.weekly_nudge("t5")["nudge"] is None   # logged -> no nudge
