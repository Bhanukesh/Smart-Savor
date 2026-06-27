# Smart Savor — PRD & Epic Backlog

*Working name · 2026-06-27 · Status: Draft v1*
*Companion docs: `smart-savor-one-pager.md`, `smart-savor-persona.md`*

---

## Product Spec (summary)

**What it is.** A practitioner tool that ingests a chronic-care patient's real grocery receipts, models their eating habits, recommends affordable cost-per-nutrient swaps the dietitian approves, and validates outcomes with 3-month labs.

**User:** the dietitian (chronic-care market; private-practice beachhead). **Beneficiary:** the patient. **Clinical authority:** always human.

**Core loop:** prescribe gaps + constraints → ingest receipts → match price×nutrient → rank in-budget swaps → dietitian approves → re-plan on changes → 3-month lab proves improvement.

**North Star:** ≥70% of patients show lab improvement at 3-month re-test.

**Out of scope (v1):** DTC, diagnostics, live retail integration, real multi-tenant SaaS, HIPAA certification.

---

## Epic Backlog

Epics ordered by dependency and priority. **P0** = MVP-critical; **P1** = fast-follow; **P2** = future. The "Validate first" flag marks the riskiest assumptions.

### EPIC 1 — Receipt Ingestion & Eating-Habit Model `P0` ⚠️ *Validate first*
*The core wedge. Everything downstream depends on this working.*
- **1.1** Upload receipts (image/PDF), multi-retailer (Costco, Walmart, generic).
- **1.2** OCR + line-item extraction (item name, qty, price, date).
- **1.3** Normalize product names; infer unit/size when size column is blank.
- **1.4** Build per-patient purchase-frequency / eating-habit profile.
- **1.5** "Insufficient / unreadable data" state — never fabricate a profile.
- *Key risk:* OCR + normalization accuracy across retailers. Validate before pilot commitment.

### EPIC 2 — Nutrient–Price Reference Engine `P0`
*The headline join: attach nutrients to prices.*
- **2.1** Food Matcher Skill — fuzzy/semantic match of product name → USDA FDC food id.
- **2.2** Eval suite (bell pepper, roma tomato, broccoli crowns + ambiguous negative).
- **2.3** Pre-computed joined reference table (Walmart price snapshot × USDA FDC), filtered to nutrient-relevant departments.
- **2.4** Imputation policy — synthetic only for genuinely missing fields (e.g. pack size); prices & nutrients always real.
- **2.5** Price-snapshot refresh trigger.

### EPIC 3 — Gap Resolver & Swap Ranking `P0`
*Turn a flagged gap into approvable swaps.*
- **3.1** Capture per-patient inputs: flagged gaps (from lab), restrictions, dislikes, weekly budget.
- **3.2** Nutrient Gap Resolver Skill — ≥3 candidate swaps per gap, ranked by cost-per-unit-nutrient.
- **3.3** Budget constraint — every weekly plan stays within stated budget.
- **3.4** Minimal-disruption score — bias toward foods near existing habits.
- **3.5** "No valid in-budget swap" explicit state.
- **3.6** Eval suite (low vit C + daily banana → citrus; low iron + vegetarian → lentils/spinach; budget-capped case).

### EPIC 4 — Practitioner Dashboard & Approval `P0`
*Where the dietitian works and stays in control.*
- **4.1** Per-patient view: prescribed targets vs. actual buying behavior.
- **4.2** Gap-closing trend over time.
- **4.3** Approve / adjust gesture on each suggested swap (nothing ships without sign-off).
- **4.4** Patient list / caseload landing view.
- **4.5** "Aha" screen treatment — *patient keeps buying X; same money, Y closes the gap.*

### EPIC 5 — Background Re-Planning Engine `P0`
*Not answer-on-demand — it re-plans.*
- **5.1** Scheduled weekly regeneration.
- **5.2** Re-plan on trigger: new lab uploaded *(headline)*, new receipt, budget edit, item disliked/unavailable, price refresh.
- **5.3** Headless Agent SDK runner invoking the Skills in prod.

### EPIC 6 — Lab Outcome Loop `P0`
*The ground truth and the moat's fuel.*
- **6.1** Capture baseline + 3-month re-test labs.
- **6.2** Link labs to active plan; compute per-gap improvement.
- **6.3** Outcome record persisted for the proprietary dataset.
- **6.4** Define between-labs proxy (purchasing/adherence) shown on dashboard.

### EPIC 7 — Security & Access `P0`
- **7.1** Clerk-gated authentication.
- **7.2** Encryption of health data at rest/in transit.
- **7.3** Security-conscious design (no HIPAA claim v1).

### EPIC 8 — Patient Inputs & Engagement `P1`
- **8.1** Photo food logging.
- **8.2** Voice food logging.
- **8.3** Patient food-preference selection feeding the ranker.

### EPIC 9 — Outputs & Notifications `P1`
- **9.1** PDF weekly Nutrient Correction Plan + deduped shopping list (WeasyPrint).
- **9.2** Email digest on plan change / new report (Resend).

### EPIC 10 — Demo / Capstone Staging `P0` *(time-boxed)*
- **10.1** 1–2 seeded patients with a real-feeling story (low iron + low vit C, cheap repetitive diet, tight budget).
- **10.2** Practitioner snapshot as landing view.
- **10.3** Langfuse traces + spend ceiling; deploy at `<student>.apps.human-angle.com` with HTTPS + cost cap.

### EPIC 11 — Monetization Foundations `P2`
- **11.1** White-label deployment for clinics/programs.
- **11.2** Insurance reimbursement code support (built on outcome dataset).
- **11.3** Control/comparison cohort to benchmark the 70% claim.
- **11.4** Real multi-tenant SaaS: patient self-onboarding, data isolation, full auth.
- **11.5** Live retail/POS or loyalty-card integration (replace manual upload).

---

## Suggested Delivery Sequence
1. **Spike (validate):** Epic 1 (ingestion accuracy) + Epic 2 (join). *Gate: is the wedge real?*
2. **Core loop:** Epics 3 → 4 → 5.
3. **Proof:** Epic 6 (lab loop) + Epic 7 (security).
4. **Demo:** Epic 10.
5. **Fast-follow:** Epics 8, 9.
6. **Scale/monetize:** Epic 11.

## Cross-Cutting Open Questions
- **[Data]** Baseline for the 70% North Star? (control cohort — Epic 11.3)
- **[Eng]** Receipt OCR/normalization accuracy across retailers? (Epic 1 — blocking)
- **[Legal]** Threshold where HIPAA path becomes required at scale?
- **[Product]** Is a monthly dashboard refresh (batch receipts) acceptable, or is photo/voice logging needed at MVP to feel "live"?
- **[Stakeholder]** Who orders/pays for 3-month pilot labs?
