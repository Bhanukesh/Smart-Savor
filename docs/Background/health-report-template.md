# Health Report Ingestion Template — Hybrid (US Lab Report × Full-Body Checkup)

*Step 1 of 3 for Agent 1 (Patient Intake Ingestion). This is the **full superset** of fields a real health report can carry. Step 2 scopes it to what Smart Savor acts on; step 3 rebuilds Agent 1 to extract it.*

*Grounded in **real LabCorp specimen reports** (CBC-with-Differential, CD4/CD8, SARS-CoV-2 antibody — files.labcorp.com sample reports) for the US-lab structure, plus the standard comprehensive **full-body-checkup** layout for the extras. Specimen/sample data only — no PHI.*

---

## How real reports are structured (observed in the LabCorp specimens)
Two layers:
1. A **header block** — patient / specimen / physician / lab metadata.
2. **Result tables grouped by ordered panel**, where every analyte is a uniform row:

`TEST · RESULT · FLAG · UNITS · REFERENCE INTERVAL · LAB` — plus an optional **PREVIOUS RESULT & DATE** (trend) column and free-text interpretive **comments**.

Flags observed: `High`, `Low`, `Alert` (critical), `HP`/`LP` (panic high/low); for qualitative tests `Negative`/`Positive` and bounded refs like `Neg <13.0`. Out-of-range rows are bolded with a ▲ icon.

---

## A. Report & patient metadata (header)

| Field | Example (from specimens) | In US lab report | In full-body checkup |
|---|---|---|---|
| `patient_name` | "Sample Report, 505271" | ✓ | ✓ |
| `patient_id` / `alt_patient_id` | — | ✓ | ✓ |
| `date_of_birth` | 01/01/1970 | ✓ | ✓ |
| `age` | 55 (also `y/m/d` e.g. 040/11/01) | ✓ | ✓ |
| `sex` / `gender` | Female / F | ✓ | ✓ |
| `phone` | — | ✓ | ✓ |
| `specimen_id` / `control_id` | 021-988-9702-0 | ✓ | ✓ |
| `date_collected` / `received` / `entered` / `reported` | 01/21/2025 | ✓ | ✓ |
| `fasting` | Not Given / Yes / No | ✓ | ✓ |
| `ordering_physician` / `referring` / `physician_id` / `npi` | — | ✓ | ✓ (referred-by/consultant) |
| `account_number` / `registration_no` / `lab_no` | 90000999 | ✓ | ✓ |
| `performing_lab` (name / address / director) | LabCorp Burlington | ✓ | ✓ |
| `clinical_info` / `report_status` | Normal / Abnormal / Negative / Positive | ✓ | ✓ |
| `ordered_items` | "CBC with Diff, Platelet, NLR" | ✓ | ✓ |
| `report_date_issued` | 12/02/20 1617 ET | ✓ | ✓ |

---

## B. Universal analyte record (every measured value)
```json
{
  "panel": "Lipid Panel",
  "test": "LDL Cholesterol",
  "value": 132,
  "unit": "mg/dL",
  "reference_low": null, "reference_high": 100,   // parsed bounds when present
  "reference_text": "<100",                        // raw range string as printed
  "flag": "High",                                  // High|Low|Alert|HP|LP|Normal|Positive|Negative|null
  "previous_value": 145, "previous_date": "2024-06-01",  // trend, if the lab prints it
  "method": null, "performing_lab": "01",
  "confidence": 0.0, "needs_review": false
}
```

---

## C. Full superset of panels & analytes (the hybrid)
*(✓US = seen in / standard for a US lab report; +FBC = added or bundled by a full-body checkup)*

### 0. Anthropometry / Vitals  *(+FBC — not in a pure US lab report)*
height, weight, **BMI**, waist circumference, body-fat %, **blood pressure** (systolic/diastolic), pulse, temperature, SpO₂, respiratory rate.

### 1. Hematology — CBC with Differential  *(✓US, grounded)*
WBC, RBC, Hemoglobin, Hematocrit, MCV, MCH, MCHC, RDW, Platelets, MPV; differential (% + absolute): Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils; Neut/Lymph ratio; Immature granulocytes (% + abs); NRBC.

### 2. Comprehensive Metabolic Panel (CMP, 14)  *(✓US)*
Glucose, BUN, Creatinine, eGFR, BUN/Creatinine ratio; Sodium, Potassium, Chloride, CO₂/Bicarbonate; Calcium; Total protein, Albumin, Globulin, A/G ratio; Bilirubin (total), Alkaline phosphatase, AST (SGOT), ALT (SGPT).

### 3. Glycemic  *(✓US +FBC — diabetes-critical)*
Fasting plasma glucose, **HbA1c (%)**, estimated average glucose (eAG), fasting insulin *(opt)*, postprandial glucose *(FBC)*.

### 4. Lipid Panel  *(✓US +FBC — cardiac-critical)*
Total cholesterol, HDL, LDL (calc/direct), VLDL, **Triglycerides**, Non-HDL cholesterol, Cholesterol/HDL ratio.

### 5. Thyroid  *(+FBC bundles; ✓US as ordered)*
TSH, Free T4, Free T3 (or Total T3/T4), anti-TPO *(opt)*.

### 6. Vitamins  *(✓US +FBC — diet-relevant)*
**Vitamin D (25-OH)**, **Vitamin B12**, **Folate**; Vitamin A, E *(opt)*.

### 7. Minerals & Iron studies  *(diet-relevant)*
**Iron (serum)**, **Ferritin**, TIBC, Transferrin saturation %, **Magnesium**, Zinc, Phosphorus, Calcium *(also CMP)*.

### 8. Inflammatory / cardiac-risk extras  *(+FBC often)*
hs-CRP, Homocysteine, Uric acid.

### 9. Urinalysis  *(+FBC bundles)*
Color, Appearance, pH, Specific gravity, Protein, Glucose, Ketones, Blood, Bilirubin, Urobilinogen, Leukocyte esterase, Nitrite; Microscopy (RBC, WBC, epithelial cells, casts, crystals).

### 10. Narrative / interpretation  *(+FBC; US has lighter comments)*
`clinical_info` (Normal/Abnormal), `general_comments`, per-test interpretive notes, **doctor's summary / impression**, **recommendations**.

---

## D. Conventions (flags · ranges · units)
- **flag** ∈ {High, Low, Alert/Critical, HP, LP, Normal, Positive, Negative, null}
- **reference** printed as a range (`3.4-10.8`), a bound (`<100`, `>40`), or text (`Not Estab.`, `Neg`). Parse to `reference_low`/`reference_high` where possible; always keep the raw `reference_text`.
- **units** vary widely: `mg/dL, g/dL, %, x10E3/uL, x10E6/uL, fL, pg, ng/mL, pg/mL, µg/dL, mmol/L, IU/L, U/L, AU/mL`.
- **previous_value + previous_date** when the lab prints a prior result (the trend column).

---

## E. Proposed superset JSON (what Agent 1 would emit — full version)
```json
{
  "report_meta": { "patient_name": {...}, "date_of_birth": {...}, "age": {...}, "sex": {...},
                   "specimen_id": ..., "date_collected": ..., "fasting": ...,
                   "ordering_physician": ..., "performing_lab": ..., "report_status": ...,
                   "ordered_items": [...] },
  "vitals":     [ { "name": "BMI", "value": 28.6, "unit": "kg/m2", "flag": null, "confidence": .., "needs_review": .. } ],
  "panels":     [ { "panel": "Lipid Panel",
                    "analytes": [ { /* universal analyte record from §B */ } ] } ],
  "narrative":  { "clinical_info": ..., "general_comments": ..., "doctor_summary": ..., "recommendations": ... },
  "overall_status": "parsed | insufficient_data"
}
```
Every scalar carries `confidence` + `needs_review`. **The agent transcribes each value and the lab's own H/L flag, but NEVER decides that something is a "gap to close" or sets a target — that stays clinician-owned** (consistent with the existing intake agent).

---

## Step 2 preview — scoping to what Smart Savor acts on
Smart Savor doesn't need all ~90 analytes. The product-relevant subset:
- **Demographics:** name, age, sex, DOB.
- **Anthropometry:** BMI (and BP, for the cardiac beachhead).
- **Diet-actionable biomarkers:** glucose + **HbA1c**, **lipids** (LDL/HDL/triglycerides), **iron + ferritin**, **vitamin D**, **vitamin B12**, **folate**, **magnesium**, calcium, potassium, sodium.
- **Conditions / context:** from `clinical_info` + narrative.

Everything else (full CBC differential, liver enzymes, urinalysis microscopy, thyroid, COVID serology, etc.) is captured-but-not-acted-on: keep it in an `other_analytes` bucket so nothing is lost, tag only the above as product-relevant. Step 3 then rebuilds Agent 1 to emit this scoped schema.
