"""End-to-end demo of the full agent pipeline on the seeded patient (Sam Rivera):

  Agent 1 Intake  ->  Agent 2 Ingestion  ->  Agent 3 Prioritization
  ->  Agent 4 Swap Sourcing (+ the USP choose-moment)  ->  Agent 5 Nudge

Runs fully offline on the real reference dataset. Usage:  python demo_pipeline.py
"""

import os

import ingestion_agent
import nudge_agent
import prioritization_agent as prio
import store
import swap_sourcing_agent as swap

PID = "sam-rivera"
_D = os.path.dirname(__file__)


def sp(name: str) -> str:
    return os.path.join(_D, "sample_data", name)


def main() -> None:
    p0 = store.get_patient(PID)
    print("=" * 68)
    print(f"SMART SAVOR — FULL AGENT PIPELINE   (patient: {PID})")
    print("=" * 68)

    print("\n[Agent 1] Intake — profile on file from the health report:")
    print(f"  {p0['name']}, {p0['age']} {p0['gender']}  ·  BMI {p0['bmi']}  ·  "
          f"conditions {p0['conditions']}")
    print(f"  clinician-flagged gaps: {[g['nutrient'] for g in p0['flagged_gaps']]}")

    print("\n[Agent 2] Ingestion — receipt (purchase) + log (consumption):")
    r = ingestion_agent.ingest_receipt(sp("sam_receipt.txt"), PID)
    lg = ingestion_agent.ingest_log(sp("sam_log.txt"), PID)
    print(f"  receipt → matched {r['matched']} foods; skipped non-food {r['skipped_nonfood']}")
    print(f"  log → {lg['count']} consumption events: {[e['item'].split(',')[0] for e in lg['events']]}")

    print("\n[Agent 3] Cycle Prioritization — focus set:")
    pr = prio.prioritize(PID)
    for f in pr["focus_set"]:
        pair = f"  (pair with {f['pair_with']})" if f["pair_with"] else ""
        print(f"  #{f['rank']} {f['nutrient']}{pair} — {f['why']}")
    print(f"  {pr['capacity_note']}")

    print("\n[Agent 4] Swap Sourcing — draft + dietitian-ratified approved menus:")
    for f in pr["focus_set"]:
        nut = f["nutrient"]
        d = swap.draft_list(PID, nut, limit=3)
        if d.get("status") != "ok":
            print(f"  {nut}: {d.get('status')}")
            continue
        swap.ratify_list(PID, nut, d["menu"])
        foods = ", ".join(c["food"].split(",")[0] for c in d["menu"])
        print(f"  {nut} (close {d['gap_size']} {d['gap_unit']}): {foods}")
        flags = [c["comorbidity_flag"] for c in d["menu"] if c["comorbidity_flag"]]
        if flags:
            print(f"      ⚠ comorbidity flags for dietitian: {flags}")

    print("\n[Agent 4 · THE USP] Patient picks an iron food → agent recomputes the amount:")
    choice = swap.patient_choice(PID, "iron", "Super Blend")
    print("  " + choice.get("message", str(choice)))

    print("\n[Agent 5] Weekly Nudge — bought-but-not-logged gap food:")
    n = nudge_agent.weekly_nudge(PID)
    if n["nudge"]:
        print(f"  bought-not-logged & gap-relevant: {n['bought_not_logged']}")
        print(f"  nudge → \"{n['nudge']['message']}\"")
    else:
        print(f"  {n['reason']}")

    p = store.get_patient(PID)
    print("\n" + "=" * 68)
    print("Clinician-owned still intact — flagged_gaps:",
          [g["nutrient"] for g in p["flagged_gaps"]],
          "| focus_set:", len(p["cycle"]["focus_set"]), "| patient_choices:",
          len(p["patient_choices"]), "| nudges:", len(p["nudges"]))
    print("=" * 68)


if __name__ == "__main__":
    main()
