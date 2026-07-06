"""Offline tests for the Patient Intake Ingestion Agent (Agent 5).

All tests run without an API key via the deterministic mock extractor. The single
live smoke test is skipped unless ANTHROPIC_API_KEY is present.

Run:  pytest test_intake_agent.py
"""

import os

import pytest

import intake_agent
import store

SAMPLE = os.path.join(os.path.dirname(__file__), "sample_data", "patient_intake_dummy.txt")


# --- read_document --------------------------------------------------------------
def test_read_document_text_block():
    block = intake_agent.read_document(SAMPLE)
    assert block["type"] == "document"
    assert block["source"]["type"] == "text"
    assert block["source"]["media_type"] == "text/plain"
    assert "Jamie Lee" in block["source"]["data"]


def test_read_document_pdf_block(tmp_path):
    pdf = tmp_path / "x.pdf"
    pdf.write_bytes(b"%PDF-1.4 fake bytes")
    block = intake_agent.read_document(str(pdf))
    assert block["source"]["type"] == "base64"
    assert block["source"]["media_type"] == "application/pdf"
    assert "\n" not in block["source"]["data"]  # base64 must have no newlines


def test_read_document_rejects_unknown_ext(tmp_path):
    f = tmp_path / "x.docx"
    f.write_text("hi")
    with pytest.raises(ValueError):
        intake_agent.read_document(str(f))


# --- mock extraction ------------------------------------------------------------
def test_mock_extraction_shape_and_values():
    ex = intake_agent.extract_profile_mock(SAMPLE)
    assert ex["overall_status"] == "parsed"
    assert ex["name"]["value"] == "Jamie Lee"
    assert ex["age"]["value"] == 47
    assert ex["gender"]["value"].lower() == "female"
    # the dummy leaves blood group blank -> must be flagged, never guessed
    assert ex["blood_group"]["value"] is None
    assert ex["blood_group"]["needs_review"] is True
    # medical history parsed into structured items with 'since' years
    conditions = [h["condition"].lower() for h in ex["medical_history"]]
    assert any("diabetes" in c for c in conditions)
    assert any(h["since"] == "2020" for h in ex["medical_history"])
    # constraints
    assert ex["constraints"]["weekly_budget_usd"] == 65.0
    assert ex["constraints"]["dislikes"]  # cilantro, liver
    # recorded measurements
    assert ex["bmi"]["value"] == 27.9
    vit_names = {v["name"] for v in ex["vitamins"]}
    assert "Vitamin D" in vit_names
    vit_d = next(v for v in ex["vitamins"] if v["name"] == "Vitamin D")
    assert vit_d["value"] == 22.0 and vit_d["unit"] == "ng/mL"
    # Folate is "____ (not reported)" -> value null, flagged for review, never guessed
    folate = next(v for v in ex["vitamins"] if v["name"] == "Folate")
    assert folate["value"] is None and folate["needs_review"] is True
    min_names = {m["name"] for m in ex["minerals"]}
    assert {"Iron (serum)", "Magnesium", "Potassium"} <= min_names


def test_dispatcher_falls_back_to_mock(monkeypatch):
    # no API key AND CLI disabled -> deterministic mock backend
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("SMART_SAVOR_NO_CLI", "1")
    _, mode = intake_agent.extract_profile(SAMPLE)
    assert mode == "mock"


def test_mock_forced_even_with_key(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    monkeypatch.setenv("SMART_SAVOR_MOCK_INTAKE", "1")
    _, mode = intake_agent.extract_profile(SAMPLE)
    assert mode == "mock"


# --- mapping --------------------------------------------------------------------
def test_to_store_profile_maps_and_collects_review_fields():
    ex = intake_agent.extract_profile_mock(SAMPLE)
    flat = intake_agent.to_store_profile(ex)
    assert flat["name"] == "Jamie Lee"
    assert flat["gender"] == "female"  # normalized lowercase
    assert "blood_group" in flat["review_fields"]
    assert all("flag" in h for h in flat["medical_history"])


# --- end-to-end persistence -----------------------------------------------------
def test_ingest_creates_patient_without_touching_clinical_fields(monkeypatch):
    monkeypatch.setenv("SMART_SAVOR_MOCK_INTAKE", "1")  # deterministic, offline
    store.PATIENTS.pop("jamie-lee", None)  # clean slate
    result = intake_agent.ingest(SAMPLE, "jamie-lee")

    assert result["mode"] == "mock"
    assert result["upsert"]["created"] is True

    p = store.get_patient("jamie-lee")
    assert p["name"] == "Jamie Lee"
    assert p["age"] == 47
    assert p["blood_group"] is None
    assert p["bmi"] == 27.9
    assert p["vitamins"] and p["minerals"]
    assert p["medical_history"]
    # the intake agent must NEVER populate clinician-owned data
    assert p["flagged_gaps"] == []
    assert p["habit_model"] == {}


def test_upsert_merge_preserves_habit_and_cycle():
    # seed patient already has habit_model + cycle populated
    before = store.get_patient("sam-rivera")
    habit_before = dict(before["habit_model"])
    cycle_before = dict(before["cycle"])

    store.upsert_patient("sam-rivera", {"blood_group": "A+", "review_fields": []})

    after = store.get_patient("sam-rivera")
    assert after["blood_group"] == "A+"          # demographic updated
    assert after["habit_model"] == habit_before  # untouched
    assert after["cycle"] == cycle_before         # untouched
    assert after["flagged_gaps"]                  # clinician gaps still present


# --- live smoke test (skipped offline) ------------------------------------------
@pytest.mark.skipif(not os.getenv("ANTHROPIC_API_KEY"),
                    reason="no ANTHROPIC_API_KEY; live extraction skipped")
def test_live_extraction_smoke():
    ex, mode = intake_agent.extract_profile(SAMPLE)
    assert mode == "live"
    for key in ("name", "age", "gender", "blood_group", "bmi", "vitamins", "minerals",
                "medical_history", "conditions", "constraints", "overall_status"):
        assert key in ex
