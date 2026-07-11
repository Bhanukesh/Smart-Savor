"""Demo: run the Patient Intake Ingestion Agent (Agent 1) on a health report.

    python demo_intake.py                          # offline (mock parser)
    ANTHROPIC_API_KEY=... python demo_intake.py    # live Claude extraction
    (no key, with the authenticated `claude` CLI available -> CLI backend)

Reads sample_data/sam_health_report.txt, auto-fills the patient record (demographics,
vitals, biomarkers), and shows what's product-relevant vs. captured-not-acted-on.
"""

import os

import intake_agent
import store

SAMPLE = os.path.join(os.path.dirname(__file__), "sample_data", "sam_health_report.txt")
PATIENT_ID = "sam-rivera-2026"


def main() -> None:
    print(f"Document : {os.path.relpath(SAMPLE)}")
    print(f"Patient  : {PATIENT_ID} (exists before: {PATIENT_ID in store.PATIENTS})\n")

    result = intake_agent.ingest(SAMPLE, PATIENT_ID)
    print(f"--- extraction mode: {result['mode'].upper()}  "
          f"(status: {result['overall_status']}) ---\n")

    p = store.get_patient(PATIENT_ID)
    print("Demographics:", {k: p[k] for k in ("name", "age", "gender", "date_of_birth")})
    print(f"BMI: {p['bmi']}   Blood pressure: {p['blood_pressure']}")
    print(f"Report meta: {p['report_meta']}")

    print("\nProduct-relevant lab_results (what Smart Savor acts on):")
    for r in p["lab_results"]:
        print(f"  {r['name']:26} {str(r['value']):>6} {r['unit'] or '':8} "
              f"ref {r['reference_text'] or '-':10} [{r['flag'] or ''}]")

    print(f"\nother_analytes (captured, NOT acted on): {len(p['other_analytes'])} — "
          + ", ".join(a["name"] for a in p["other_analytes"]))
    print("conditions:", p["conditions"])

    review = result["upsert"]["review_fields"]
    print("\nNeeds dietitian review:", ", ".join(review) if review else "(none)")

    print("\nClinician-owned (untouched by the intake agent):")
    print("  flagged_gaps :", p["flagged_gaps"])
    print("  habit_model  :", p["habit_model"])


if __name__ == "__main__":
    main()
