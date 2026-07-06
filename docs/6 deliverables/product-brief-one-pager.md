# Smart Savor — Product Brief (One-Pager)

*updated 2026-07-05 · consolidated from the short one-pager + the long product brief, reconciled with `smart-savor-demo-script.md` (current source of truth).*

> **One line:** An adherence-and-outcomes instrument for dietitians — ingest a patient's real grocery history, let them **choose** the gap-closing food swaps (agent-drafted, dietitian-ratified, so every choice is clinically safe), confirm consumption with light logs + a weekly nudge, and prove the diet worked with periodic labs — turning diet outcomes into reimbursable results.

---

## 1. The Problem
Dietitians serving chronic-care patients don't struggle to *prescribe* the right diet — that advice is near-commodity. They struggle to know whether the patient **actually follows it**, and to **prove it worked**. Between appointments they're blind: they set targets and hope. With ~80% of healthcare spend tied to diet-related chronic disease, that blind spot means unmanaged conditions, wasted visits, and no evidence of impact.

## 2. The Insight
The defensible product isn't a nutrient-gap calculator (solved, commoditized) — it's an **adherence-and-outcomes layer**:
1. **Observe real behavior** from data the patient already generates — grocery receipts — instead of begging them to log every meal (the graveyard food-logging apps die in).
2. **Drive adoption through choice** — a menu of gap-closing swaps the patient picks from, ranked by how fast they close the gap and how little they disrupt current habits.
3. **Prove it worked** with a periodic lab re-test as ground truth.

Purchasing behavior is the *between-labs proxy*; the lab is the *periodic ground truth*. Together they form a closed loop no incumbent runs.

## 3. Who It's For
**Dietitians** managing diet-driven chronic conditions — the buyer and clinical authority. The **patient** is the beneficiary and a light data-entry surface; the dietitian stays in control (sets targets, approves/adjusts every swap). Smart Savor is a workflow tool, not a diagnostic one.
- **Beachhead (v1):** private-practice dietitians serving **Type 2 diabetics with elevated cardiac risk** — a deliberately narrow vertical. Type 2 diabetics are **2–4× more likely to develop or die from heart disease**, and clean diet is first-line control for the BP and cholesterol driving it. Narrow focus makes the approved-swap lists a reusable template, deepens outcome data faster, and lands on an already-reimbursed condition. (Private practice = fast to deploy, cash-rich, no procurement committee.)
- **Expansion:** CKD, hypertension, GLP-1 follow-up — *after* the loop is proven in the beachhead.
- **Geography:** US (the reimbursement thesis is US-anchored).

## 4. The Core Bet & USP
Not a nutrient calculator but an **adherence-and-outcomes instrument**, built on one hard-to-copy loop and one USP that drives adherence:

> **The doctor prescribes what the body needs; the patient chooses the food that delivers it.**
> Ingest real grocery receipts → model what the patient actually eats → offer a menu of gap-closing swaps *the patient picks from* (agent-drafted, **dietitian-ratified**, so every choice is clinically safe) → confirm consumption with light photo/voice logs and a gentle weekly nudge → validate with a 3-month lab.

- **USP = choice within clinical bounds.** The dietitian fixes the nutrient target (X); the patient freely chooses the source; the agent computes how much (Y). Same target, a food he'll actually eat — the diet becomes a menu he picks from, not a prescription he endures. *That's the adherence win.*
- **Receipts prove purchase; logs prove consumption.** Smart Savor **reconciles** the two ("you bought spinach — did you eat it?") and nudges only on the bought-but-not-logged gap, **weekly, never daily** (daily-logging dependence is what kills adoption).
- **Ranking:** primarily gap-closing efficiency + minimal disruption. **Affordability stays in the data model as an optional signal (reserved for a future B2C launch), not enforced in B2B v1.**

The wedge is **receipt-to-habit ingestion**; the durable moat is the **condition-specific outcome dataset** the loop generates (see §6).

## 5. The Solution — Core Flow
A per-patient practitioner view showing **prescribed targets vs. what the patient actually buys/eats vs. whether the gap is closing**, plus agent-drafted swaps the dietitian ratifies.
1. Patient uploads 3–5 months of grocery receipts (Costco / Walmart / any). System builds an eating-habit model from real history. Optional ongoing photo/voice logging — the patient's choice.
2. Dietitian enters flagged nutrient gaps (from the patient's lab) + constraints (restrictions, dislikes, budget).
3. Agent drafts a comorbidity-screened menu of ≥3 gap-closing swaps per gap, ranked by gap-closing efficiency and minimal disruption. **The patient picks the foods he'll actually eat; the agent recomputes the amount to still hit the target.** (Cost shown as optional context, not an enforced budget.)
4. Dietitian approves / adjusts. The plan re-plans on changed inputs (new lab, new receipts, disliked item) and refreshes weekly.
5. **3-month lab re-test** validates whether the gap actually closed — the outcome record.

*Example:* Patient flagged low vitamin C, buying a banana daily. The agent surfaces citrus and other high-vitamin-C options close to his habits; he picks oranges, the agent computes the serving needed to hit the target, the dietitian approves. Three months later, labs confirm.

## 6. The Moat — a receipt-to-outcome data engine
- **Wedge (operational):** turning raw, messy receipts into a normalized eating-habit model joined to a nutrient reference table (price retained as an optional layer for B2C). Receipt OCR alone is commoditizing; the *pipeline* (receipts → habit model → nutrient join → gap-closing, low-disruption ranking) is hard to assemble.
- **Durable moat (compounding):** the closed loop generates a **condition-specific outcome dataset** — which swaps, for which gaps, produced real lab improvement. It compounds with scale and becomes the evidence base for reimbursement. Incumbents (Healthie, Nutrium, Cronometer) own the practitioner workflow but don't run this loop and can't retroactively manufacture the data.

## 7. The Business
Land free, monetize on proof — plugging into reimbursement that **already exists**:
- **Free MVP** with private-practice dietitians (no procurement) → prove the loop on real patients.
- **Per-patient-per-month** to chronic-care programs (they have budgets and measure outcomes).
- The tool **pays for itself by unlocking billing** the dietitian couldn't capture before — Medical Nutrition Therapy (covered for diabetes/CKD) + Remote Therapeutic Monitoring (the weekly logging loop). *(Verify current-year CPT codes/coverage with CMS/billing before quoting.)*
- Long horizon: proven outcomes → white-label licensing → payer reimbursement.

## 8. What Success Looks Like
- **North Star:** ≥**70% of patients show measurable lab improvement at 3-month re-test** vs. a defined baseline. *(The baseline/control — "70% vs. what standard-care rate?" — is an early priority; the metric isn't credible to investors/payers without it.)*
- **Proving causation (not just correlation):** the biochemistry (intake → biomarker) is settled science; we only prove **app → intake behavior**, via an **internal dose-response** (adherent vs. non-adherent patients improve differently) plus within-patient pre/post and a stepped-wedge pilot. Message early data as "promising signal," never "proven," until controlled.
- **Leading indicators:** ≥80% of patients get a usable habit model from receipts; ≥70% swap approve/adjust rate; ≥85% of gaps have a viable gap-closing swap; weekly-loop engagement holds mid-cycle.

## 9. Key Risks & Open Assumptions
| Risk / Assumption | Why it matters | Status |
|---|---|---|
| **Receipt ingestion accuracy** | The whole wedge — messy SKUs, blank sizes, fuzzy matching to nutrient data. | Core engineering bet |
| **Bought ≠ ate ≠ absorbed** | Purchasing is a proxy; the logs + weekly-nudge reconciliation is how we tighten it. Only labs are ground truth. | Addressed by design |
| **Attribution / causation** | Payers need proof the app moved behavior; dose-response is the cheapest credible rung. | Open — needs pilot |
| **Comorbidity safety** | Beachhead patients have overlapping conditions; every swap must be screened and dietitian-ratified. | By design (human-in-loop) |
| **Baseline / control for 70%** | The North Star is only credible against a comparison. | Open |
| **Batch ≠ real-time** | Receipts are retrospective; don't over-promise live cadence. | Acknowledged |
| **Incumbent response** | Healthie / Nutrium own the workflow. Speed to accumulate outcome data is the defense. | Strategic |
| **Insurance pathway** | Reimbursement codes are a long, regulated road. | Long-horizon |

## 10. MVP / Demo Scope
- 1–2 seeded patients with a real-feeling story (Type 2 + cardiac risk; e.g. low iron + low vitamin C, repetitive diet). See `smart-savor-demo-script.md` for the scene-by-scene walkthrough.
- The hero moment front and center: the **USP "choose" screen** — the patient swaps a flagged gap's source and the agent recomputes the amount → dietitian **approves**.
- Practitioner snapshot as the landing view: prescribed vs. actual vs. gap-closing trend, plus the macro/mineral dashboard.
- **Out of scope for the capstone:** real multi-tenant SaaS, auth/onboarding, data isolation, live retail integration, and **Weekly Fresh Produce Fulfillment** (§11). Seeded purchase data is acceptable for the capstone; the real product uses uploaded receipt history.
- **Honest data note:** the reference table is a real join of a Walmart price snapshot (Kaggle) × USDA FoodData Central; synthetic imputation only for genuinely missing fields (e.g. pack size). Prices and nutrients are real.

## 11. Signature Future Differentiator — Weekly Fresh Produce Fulfillment *(out of scope for v1)*
Once a patient's swaps are set, auto-order a week's worth of the dietitian-approved, patient-chosen **fresh produce (fruits & vegetables)** to their door — one week at a time — closing the loop from *recommendation* to *doorstep* and deleting the #1 adherence killer: friction. v1 is a **consent-first, one-tap cart hand-off** (Instacart Health / Kroger), not silent auto-charging. It unlocks **"Food is Medicine" produce-prescription reimbursement** — the payer funds the groceries and Smart Savor sits in the middle of a reimbursed transaction. **Not built for the capstone (Phase 3 expansion)** — but the feature that makes the vision uniquely sticky and the payer sale far easier.

---
*Companion docs: demo script (`smart-savor-demo-script.md`, current source of truth), personas (`smart-savor-persona.md`), PRD & epic backlog (`smart-savor-prd-epics.md`), architecture (`smart-savor-architecture.md`). The technical build (custom MCP, eval-backed Skills, deploy infra) is specified in `smart-savor-capstone-spec.md`.*
