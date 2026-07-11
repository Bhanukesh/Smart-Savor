"""Offline tests for the Patient Intake Ingestion Agent (Agent 1) — health-report ingest.

All tests run without an API key via the deterministic mock parser. The single live
smoke test is skipped unless ANTHROPIC_API_KEY is present.

Run:  pytest test_intake_agent.py
"""

import os

import pytest

import intake_agent
import store

SAMPLE = os.path.join(os.path.dirname(__file__), "sample_data", "sam_health_report.txt")


# --- read_document --------------------------------------------------------------
def test_read_document_text_block():
    block = intake_agent.read_document(SAMPLE)
    assert block["type"] == "document"
    assert block["source"]["type"] == "text"
    assert "Sam Rivera" in block["source"]["data"]


def test_read_document_pdf_block(tmp_path):
    pdf = tmp_path / "x.pdf"
    pdf.write_bytes(b"%PDF-1.4 fake bytes")
    block = intake_agent.read_document(str(pdf))
    assert block["source"]["type"] == "base64"
    assert block["source"]["media_type"] == "application/pdf"
    assert "\n" not in block["source"]["data"]


def test_read_document_rejects_unknown_ext(tmp_path):
    f = tmp_path / "x.docx"
    f.write_text("hi")
    with pytest.raises(ValueError):
        intake_agent.read_document(str(f))


# --- mock extraction ------------------------------------------------------------
def test_mock_report_meta_and_vitals():
    ex = intake_agent.extract_profile_mock(SAMPLE)
    assert ex["overall_status"] == "parsed"
    rm = ex["report_meta"]
    assert rm["patient_name"]["value"] == "Sam Rivera"
    assert rm["age"]["value"] == 54
    assert rm["sex"]["value"].lower() == "male"
    assert rm["fasting"]["value"].lower() == "yes"
    v = ex["vitals"]
    assert v["bmi"]["value"] == 30.3
    assert v["blood_pressure_systolic"]["value"] == 138
    assert v["blood_pressure_diastolic"]["value"] == 88


def test_mock_analytes_transcribed_and_missing_flagged():
    ex = intake_agent.extract_profile_mock(SAMPLE)
    by_name = {a["name"]: a for a in ex["analytes"]}
    # value + unit + flag transcribed exactly
    assert by_name["HbA1c"]["value"] == 7.2
    assert by_name["HbA1c"]["unit"] == "%"
    assert by_name["HbA1c"]["flag"] == "High"
    assert any("LDL" in n for n in by_name)
    # the missing Folate is flagged, never guessed
    folate = next(a for a in ex["analytes"] if a["name"].lower().startswith("folate"))
    assert folate["value"] is None and folate["needs_review"] is True
    # non-relevant analytes are still captured
    assert "TSH" in by_name and "Hemoglobin" in by_name


def test_mock_conditions_extracted():
    ex = intake_agent.extract_profile_mock(SAMPLE)
    joined = " ".join(ex["conditions"]).lower()
    assert "diabetes" in joined and "hyperlipidemia" in joined


# --- scoping / routing ----------------------------------------------------------
def test_is_product_relevant():
    assert intake_agent.is_product_relevant("HbA1c")
    assert intake_agent.is_product_relevant("LDL Cholesterol")
    assert intake_agent.is_product_relevant("Ferritin")
    assert intake_agent.is_product_relevant("Vitamin D, 25-Hydroxy")
    assert not intake_agent.is_product_relevant("TSH")
    assert not intake_agent.is_product_relevant("Hemoglobin")


def test_to_store_profile_routes_and_flags():
    flat = intake_agent.to_store_profile(intake_agent.extract_profile_mock(SAMPLE))
    assert flat["name"] == "Sam Rivera" and flat["gender"] == "male"
    assert flat["bmi"] == 30.3
    assert flat["blood_pressure"] == {"systolic": 138, "diastolic": 88}
    lab = {r["name"] for r in flat["lab_results"]}
    other = {r["name"] for r in flat["other_analytes"]}
    assert "HbA1c" in lab and "Ferritin" in lab          # product-relevant -> lab_results
    assert "TSH" in other and "Hemoglobin" in other      # rest -> other_analytes
    assert any("folate" in f.lower() for f in flat["review_fields"])


def test_dispatcher_falls_back_to_mock(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("SMART_SAVOR_NO_CLI", "1")
    _, mode = intake_agent.extract_profile(SAMPLE)
    assert mode == "mock"


# --- end-to-end persistence -----------------------------------------------------
def test_ingest_creates_patient_without_touching_clinical_fields(monkeypatch):
    monkeypatch.setenv("SMART_SAVOR_MOCK_INTAKE", "1")
    store.PATIENTS.pop("sam-rivera-2026", None)
    result = intake_agent.ingest(SAMPLE, "sam-rivera-2026")

    assert result["mode"] == "mock"
    assert result["upsert"]["created"] is True

    p = store.get_patient("sam-rivera-2026")
    assert p["name"] == "Sam Rivera" and p["bmi"] == 30.3
    assert p["lab_results"] and p["other_analytes"]
    # the intake agent must NEVER populate clinician-owned data
    assert p["flagged_gaps"] == []
    assert p["habit_model"] == {}


def test_upsert_merge_preserves_habit_and_cycle():
    before = store.get_patient("sam-rivera")
    habit_before = dict(before["habit_model"])
    cycle_before = dict(before["cycle"])

    store.upsert_patient("sam-rivera", {"bmi": 31.0, "review_fields": []})

    after = store.get_patient("sam-rivera")
    assert after["bmi"] == 31.0                   # vital updated
    assert after["habit_model"] == habit_before   # untouched
    assert after["cycle"] == cycle_before          # untouched
    assert after["flagged_gaps"]                   # clinician gaps still present


# --- live smoke test (skipped offline) ------------------------------------------
@pytest.mark.skipif(not os.getenv("ANTHROPIC_API_KEY"),
                    reason="no ANTHROPIC_API_KEY; live extraction skipped")
def test_live_extraction_smoke():
    ex, mode = intake_agent.extract_profile(SAMPLE)
    assert mode == "live"
    for key in ("report_meta", "vitals", "analytes", "conditions", "overall_status"):
        assert key in ex
