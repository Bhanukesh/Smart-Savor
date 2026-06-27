# Product Brief — Smart Savor *(working name)*

> **One line:** An adherence-and-outcomes instrument for dietitians: ingest a patient's real grocery history, surface affordable food swaps they'll actually buy, and prove the diet worked with periodic labs — turning diet outcomes into reimbursable results.

---

## 1. The Problem

Dietitians and health coaches don't have a "what diet?" problem — they have a **"did the patient follow it?"** problem.

In practice, most clients arrive with the same handful of issues and get the same well-understood advice ("you're low on iron, eat more lentils and spinach"). The advice is nearly a commodity. **The failure point is adherence:** patients don't follow the plan, and the practitioner has no visibility into real-life behavior between appointments. Today they set targets and *hope*.

This matters because **~80% of healthcare spending goes toward managing diet-related chronic disease** (diabetes, CKD, hypertension, obesity). The bottleneck isn't clinical knowledge — it's the gap between prescription and behavior, and the inability to prove an intervention worked.

## 2. The Insight

The defensible product isn't a nutrient-gap calculator (solved, commoditized). It's an **adherence-and-outcomes layer**:

1. **Observe real behavior** from the data patients already generate — grocery receipts — instead of begging them to log meals daily (the graveyard every food-logging app dies in).
2. **Prescribe swaps the patient will actually adopt** — ranked by how fast they close the gap and how close they are to existing habits (affordability is an optional signal, reserved for a future B2C launch).
3. **Prove it worked** with a periodic lab re-test as ground truth.

Purchasing behavior is the *between-labs proxy*; the lab is the *periodic ground truth*. Together they form a closed loop no incumbent currently runs.

## 3. Target User & Buyer

- **User:** Dietitians / nutritionists / health coaches managing patients with diet-driven conditions.
- **Market (where the money is):** Chronic-care programs (diabetes, CKD, hypertension, GLP-1 follow-up) — the only segment where outcomes are measured and reimbursed by payers.
- **Beachhead (on-ramp):** Private-practice dietitians who already serve chronic patients — fast to deploy, cash-rich, no procurement committee. They generate the first outcome data that earns the right to sell into programs and payers.
- **End beneficiary:** The patient. The dietitian stays in clinical control (sets targets, approves/adjusts every swap). Smart Savor is a workflow tool, not a diagnostic one.
- **Geography:** US (insurance-reimbursement thesis is US-anchored).

## 4. The Solution

A per-patient practitioner dashboard that shows **prescribed targets vs. what the patient actually buys vs. whether the gap is closing**, plus agent-generated swaps the dietitian approves or adjusts.

**Core flow:**
1. Patient uploads 3–5 months of grocery receipts (Costco / Walmart / any). System builds an eating-habit model from real history. Optional ongoing photo or voice logging — patient's choice.
2. Dietitian enters flagged nutrient gaps (from the patient's lab report) + constraints (restrictions, dislikes, weekly budget).
3. Agent proposes ≥3 candidate swaps per gap, ranked by **gap-closing efficiency** (most of the target nutrient per serving) and **minimal disruption** from current habits. Cost is shown as optional context, not an enforced budget. Patient can pick which foods they prefer to close a given gap.
4. Dietitian approves / adjusts. Plan regenerates weekly and re-plans on changed inputs (new lab, new receipts, budget edit, disliked item).
5. **3-month lab re-test** validates whether the gap actually closed — the outcome record.

*Example:* Patient flagged low vitamin C, buying a banana daily. Agent proposes citrus — far more vitamin C per serving and close to current habits (and, optionally, cheaper per mg). Dietitian approves. Three months later, labs confirm.

## 5. The Moat

**A receipt-to-outcome data engine.**

- **Wedge (operational):** Turning raw, messy receipts into a normalized eating-habit model joined to a nutrient reference table (with price retained as an optional layer for B2C). Receipt OCR alone is commoditizing; the *pipeline* (receipts → habit model → nutrient join → gap-closing, low-disruption ranking) is hard to assemble.
- **Durable moat (compounding):** The closed loop generates proprietary **outcome data** — which interventions, for which gaps, at what cost, produced measurable lab improvement. This data compounds, gets better with scale, and becomes the evidence base for insurance reimbursement. Incumbents (Healthie, Nutrium, Cronometer) own the practitioner workflow but do not run this loop and cannot retroactively manufacture the outcome dataset.

## 6. Business Model

Land-free, monetize-on-proof:
1. **MVP:** Free to a handful of dietitians. Prove the loop works on real patients.
2. **White-labeling:** License the engine to clinics / chronic-care programs.
3. **Insurance reimbursement:** Once outcomes are proven, pursue reimbursement codes — get paid by payers for measurable diet outcomes. This is why the chronic-care market and the lab-outcome loop matter: it's the only path where the checks are large and recurring.

## 7. Success Metric (North Star)

**70% of patients show lab improvement at 3-month re-test.**

*(Needs a baseline/control to be credible to investors and payers — "70% vs. what untreated/standard-care rate?" — defining that comparison is an early priority.)*

## 8. Key Risks & Open Assumptions

| Risk / Assumption | Why it matters | Status |
|---|---|---|
| **Receipt ingestion accuracy** | The whole wedge. Messy SKUs, blank sizes, fuzzy matching to nutrient data. | Core engineering bet |
| **Batch ≠ real-time** | Receipts are retrospective; the dashboard refreshes ~monthly, not live. Don't over-promise cadence. | Acknowledged |
| **Proxy honesty** | Bought ≠ ate ≠ absorbed. Purchasing is a proxy; only labs are ground truth. Must be framed honestly. | Acknowledged |
| **Lab re-test friction** | Labs cost money, take weeks, patient-dependent timing. 3-month cadence assumed. | Assumed |
| **Control group for 70%** | The North Star is only credible against a baseline. | Open |
| **Incumbent response** | Healthie / Nutrium own the workflow. Speed to accumulate outcome data is the defense. | Strategic |
| **Insurance pathway** | Reimbursement codes are a long, regulated road. | Long-horizon |

## 9. MVP / Demo Scope

- 1–2 seeded patients with a real-feeling story (e.g. low iron + low vitamin C, repetitive cheap diet, tight budget).
- The "aha" screen front and center: *this patient keeps buying X; for the same money, Y closes the gap* → dietitian clicks **approve**.
- Practitioner snapshot as the landing view: prescribed vs. actual vs. gap-closing trend.
- **Out of scope for demo:** real multi-tenant SaaS, real auth/onboarding, data isolation, live retail integration. Synthetic/seeded purchase data is acceptable for the capstone; the real product uses uploaded receipt history.
- **Honest data note:** reference table is a real join of Walmart price snapshot (Kaggle) × USDA FoodData Central; synthetic imputation only for genuinely missing fields (e.g. pack size). Prices and nutrients are real.

---

*This brief is the product/business framing. The technical build (custom MCP, eval-backed Skills, sources, multi-modal outputs, deploy infra) is specified separately in `smart-savor-capstone-spec.md`.*
