"""Demo: run the Patient Intake Ingestion Agent on a dummy document.

    python demo_intake.py                          # offline (mock extractor)
    ANTHROPIC_API_KEY=... python demo_intake.py    # live Claude extraction

Reads sample_data/patient_intake_dummy.txt, auto-fills a new patient profile, and
prints what was filled and what the dietitian still needs to review.
"""

import json
import os

import intake_agent
import store

SAMPLE = os.path.join(os.path.dirname(__file__), "sample_data", "patient_intake_dummy.txt")
PATIENT_ID = "jamie-lee"


def main() -> None:
    print(f"Document : {os.path.relpath(SAMPLE)}")
    exists_before = PATIENT_ID in store.PATIENTS
    print(f"Patient  : {PATIENT_ID} (exists before: {exists_before})\n")

    result = intake_agent.ingest(SAMPLE, PATIENT_ID)

    print(f"--- extraction mode: {result['mode'].upper()}  "
          f"(status: {result['overall_status']}) ---\n")

    profile = store.get_patient(PATIENT_ID)
    shown = {k: profile[k] for k in
             ("name", "age", "gender", "blood_group", "bmi", "vitamins", "minerals",
              "medical_history", "conditions", "constraints")}
    print("Auto-filled patient profile:")
    print(json.dumps(shown, indent=2))

    review = result["upsert"]["review_fields"]
    print("\nWritten fields   :", ", ".join(result["upsert"]["written_fields"]) or "(none)")
    print("Needs dietitian review:", ", ".join(review) if review else "(none)")

    # prove the agent never touched clinician-owned data
    print("\nClinician-owned (untouched by intake agent):")
    print("  flagged_gaps :", profile["flagged_gaps"])
    print("  habit_model  :", profile["habit_model"])


if __name__ == "__main__":
    main()
