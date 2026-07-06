# Smart Savor — PRD & Epic Backlog

*Working name · updated 2026-07-05 (reconciled with `smart-savor-demo-script.md`) · Status: Draft v2*
*Companion docs: `smart-savor-one-pager.md`, `smart-savor-persona.md`, `smart-savor-demo-script.md`*

---

## Product Spec (summary)

**What it is.** A practitioner tool that ingests a chronic-care patient's real grocery receipts,
models their eating habits, and offers the patient a **menu of gap-closing swaps to choose from** —
drafted by an agent, **ratified by the dietitian**, so every choice is clinically safe. It confirms
what the patient actually eats (light photo/voice logs + a weekly nudge), and validates outcomes
with 3-month labs.

**Beachhead (v1):** private-practice dietitians serving **Type 2 diabetics with elevated cardiac
risk**. One condition on purpose — it makes approved-swap lists a reusable template, deepens outcome
data faster, and lands on an already-reimbursed category.

**User:** the dietitian (buyer + clinical authority). **Beneficiary:** the patient (the emotional
heart of the experience). **Clinical authority:** always human.

**The USP.** The doctor prescribes the *nutrient target* (X, fixed/clinical); the patient *chooses
the food* that delivers it (the source, free — from a dietitian-ratified menu); the agent *computes
the amount* (Y). Same target, a food the patient will actually eat. The diet becomes a menu he picks
from, not a prescription he endures.

**Core loop:** dietitian flags gaps → agent drafts a condition×gap **approved swap list** →
dietitian **ratifies** → patient **chooses** from the menu (agent computes the amount) → receipts
(purchase) + logs (consumption) **reconciled**, weekly nudge on the gap → 3-month lab proves it.

**North Star:** ≥70% of patients show lab improvement at 3-month re-test (vs. a defined baseline;
proven via internal dose-response — see `smart-savor-hypothesis.md`).

**Out of scope (v1):** DTC, diagnostics, live retail integration, **Weekly Fresh Produce Fulfillment**
(auto-ordering produce — see EPIC 14.6, the signature Phase 3 differentiator), real multi-tenant SaaS,
HIPAA certification, conditions beyond the beachhead.

---

## Epic Backlog

Epics ordered by dependency and priority. **P0** = MVP-critical; **P1** = fast-follow; **P2** =
future. ⚠️ *Validate first* marks the riskiest assumptions.

### EPIC 1 — Receipt Ingestion & Eating-Habit Model (the PURCHASE signal) `P0` ⚠️ *Validate first*
*The core wedge. Everything downstream depends on this working.*
- **1.1** Upload receipts (image/PDF), multi-retailer (Costco, Walmart, generic).
- **1.2** OCR + line-item extraction (item name, qty, price, date).
- **1.3** Normalize product names; infer unit/size when the size column is blank (flag as imputed).
- **1.4** Build per-patient purchase-frequency / eating-habit profile.
- **1.5** "Insufficient / unreadable data" state — never fabricate a profile.
- *Key risk:* OCR + normalization accuracy across retailers. Validate before pilot commitment.

### EPIC 2 — Nutrient–Price Reference Engine `P0`
*The headline join: attach nutrients to prices.*
- **2.1** Food Matcher — fuzzy/semantic match of product name → USDA FDC food id.
- **2.2** Eval suite (bell pepper, roma tomato, broccoli crowns + ambiguous negative).
- **2.3** Pre-computed joined reference table (Walmart price snapshot × USDA FDC), filtered to
  nutrient-relevant departments.
- **2.4** Imputation policy — synthetic only for genuinely missing fields (e.g. pack size); prices &
  nutrients always real.
- **2.5** Price-snapshot refresh trigger.

### EPIC 3 — Approved-List Drafting & Ratification `P0`
*How "eat what you like" stays clinically safe. Agent drafts, dietitian ratifies.*
- **3.1** Agent drafts a **condition × gap approved-swap template** (e.g. "foods that close a
  magnesium gap for a Type 2 patient"), reusable across patients in the vertical.
- **3.2** Personalize the template per patient: subtract dislikes/restrictions, screen for
  **comorbidities** (a T2D + cardiac patient must not be offered a swap that spikes glucose/potassium).
- **3.3** Dietitian **ratifies** (approve / edit / remove items) before anything reaches the patient —
  the step that preserves clinical safety and the "agent-assisted clinician" posture.
- **3.4** Persist the ratified list as the bounded set the patient chooses from.

### EPIC 4 — Gap Resolver & Swap Menu — THE USP `P0`
*Turn a flagged gap into a menu the patient picks from; the agent computes the amount.*
- **4.1** Nutrient Gap Resolver — rank the ratified list by **gap-closing efficiency** (most target
  nutrient per serving) then **minimal disruption** (closeness to current habits).
- **4.2** **Patient choice → recompute:** patient picks any food on the menu; the system computes
  **how much (Y)** of it closes the same target (X). Different food → different Y, same X.
- **4.3** **"Still approved":** the chosen swap shows the dietitian's target fully closed + her
  sign-off. Choice for the patient, control for the dietitian.
- **4.4** Cost is an optional, non-enforced signal (reserved as a B2C lever — sort by cost without
  changing the data model).
- **4.5** "No viable swap within constraints" explicit state — never a silently weak plan.
- **4.6** Eval suite (low iron + vegetarian → lentils vs. spinach with correct amounts; budget-view
  case; empty-menu case).

### EPIC 5 — Consumption Logging & Purchase-vs-Consumption Reconciliation `P0`
*Receipts prove purchase; logs prove consumption. Smart Savor reconciles the two.*
- **5.1** Photo / voice / text food logging — low-effort, opt-in, "when the patient wants" (no forms).
- **5.2** Resolve logged items to the same FDC entries (reuse Food Matcher).
- **5.3** **Reconciliation:** compare purchased (receipts) vs. consumed (logs) — "you bought spinach;
  did you eat it, or did the money go to waste?" Surface the answer to the dietitian.
- **5.4** **Consumption-confidence model:** rank evidence photo > nudge-confirmed >
  inferred-from-receipt. Persist confidence per item (honest about how we know).

### EPIC 6 — Weekly Nudge Loop `P0`
*Gentle, weekly, enforced — carries mid-cycle engagement. Never a daily firehose.*
- **6.1** **Trigger = set difference:** items on receipts − items logged = the **bought-but-not-logged**
  set, narrowed to gap-relevant foods. Only chase the one signal we're missing.
- **6.2** Smart, kind nudge copy tying the known-purchased food to the clinical goal ("did you get to
  have the spinach? it's your fastest way to close that magnesium gap") — help, not surveillance.
- **6.3** **Weekly cadence, never daily** (daily-logging dependence is the #1 patient churn risk).
- **6.4** A nudge-confirmed "yes" writes a nudge-confidence consumption record (see 5.4).

### EPIC 7 — Patient App: Menu + Macro/Mineral Dashboard `P0`
*The patient-facing experience (the demo's emphasis).*
- **7.1** The swap menu UI (EPIC 4 surfaced): choose → recompute → still-approved.
- **7.2** **Macro/mineral dashboard:** a gauge per target (fiber, healthy fats, potassium, key
  vitamins/minerals) trending toward the in-range bands the dietitian set.
- **7.3** **Honesty guardrail:** the gauge shows *confirmed-log intake toward target* (behavior),
  **not** a between-labs blood level. Label "you're eating your way toward the gap," never "your
  magnesium is rising." Driven only by logged foods, never purchases alone.
- **7.4** "Your dietitian approved this" on every card — trust anchor.

### EPIC 8 — Practitioner Dashboard & Approval `P0`
*Where the dietitian works and stays in control.*
- **8.1** Per-patient view: prescribed targets vs. actual behavior (purchase + reconciled consumption).
- **8.2** Gap-closing trend over time; between-visit adherence read.
- **8.3** Ratify agent-drafted approved lists (EPIC 3.3) + approve/adjust gesture; nothing ships
  without sign-off.
- **8.4** Patient list / caseload landing view.
- **8.5** "Aha" screen treatment — *patient keeps buying X; here's the ratified menu he chose from.*

### EPIC 9 — Background Re-Planning Engine `P0`
*Not answer-on-demand — it re-plans and orchestrates the loop.*
- **9.1** Scheduled **weekly regeneration** (`weekly_cron`) — re-source open gaps, fire the nudge loop.
- **9.2** Re-plan on trigger: new lab uploaded *(headline)*, new receipt, new log, budget edit, item
  disliked/unavailable, price refresh.
- **9.3** Headless Agent SDK runner invoking the agents in prod; do not recompute unaffected work
  (cost discipline).

### EPIC 10 — Lab Outcome Loop & Attribution `P0`
*The ground truth and the moat's fuel.*
- **10.1** Capture baseline + 3-month re-test labs; each patient is their own pre/post baseline.
- **10.2** Link labs to active plan; compute per-gap improvement.
- **10.3** Outcome record persisted for the proprietary, **condition-specific** dataset.
- **10.4** **Attribution hooks:** persist the adherence signal (confirmed-consumption of gap-closing
  foods) so adherent-vs-non-adherent **dose-response** can be computed (the causal proof — see
  falsifiable-hypothesis doc). The chronic cycle **repeats** (managed, not cured).

### EPIC 11 — Security & Access `P0`
- **11.1** Clerk-gated authentication. **11.2** Encryption at rest/in transit.
- **11.3** Security-conscious design (no HIPAA claim v1).

### EPIC 12 — Outputs & Notifications `P1`
- **12.1** PDF weekly Nutrient Correction Plan + deduped shopping list (WeasyPrint).
- **12.2** Email digest on plan change / new report / attention-needed (Resend).

### EPIC 13 — Demo / Capstone Staging `P0` *(time-boxed)*
- **13.1** 1 seeded Type 2 patient (Sam) with a real-feeling story (iron/magnesium/fiber gaps,
  repetitive diet, family household so purchase ≠ personal consumption).
- **13.2** The USP moment front and center: choose → recompute → still-approved.
- **13.3** Langfuse traces + spend ceiling; deploy at `<student>.apps.human-angle.com` with HTTPS + cost cap.

### EPIC 14 — Monetization Foundations `P2`
- **14.1** **Billing support: MNT (CPT 97802/97803) + RTM (CPT 98975–98978)** — the weekly loop is the
  billable monitoring. *(⚠️ Fact-flag: CPT codes/coverage/rates change annually — verify with CMS/billing.)*
- **14.2** White-label deployment for clinics/programs.
- **14.3** Control/comparison cohort + dose-response analysis to benchmark the 70% claim.
- **14.4** Real multi-tenant SaaS: patient self-onboarding, data isolation, full auth.
- **14.5** Live retail/POS or loyalty-card integration; CGM pairing for objective T2D adherence.
- **14.6** **Weekly Fresh Produce Fulfillment (signature differentiator).** Auto-order a week's worth of
  the dietitian-approved, patient-chosen fresh produce (fruits & vegetables) to the patient's door, one
  week at a time — closing the loop recommendation→doorstep and deleting adherence friction. v1 =
  consent-first one-tap cart hand-off (Instacart Health / Kroger APIs), not silent auto-charging.
  Powered by **Agent 7 — Fulfillment / Cart-Builder (post-MVP)**. Unlocks "Food is Medicine"
  produce-prescription reimbursement (payer funds the groceries).

---

## Suggested Delivery Sequence
1. **Spike (validate):** Epic 1 (ingestion accuracy) + Epic 2 (join). *Gate: is the wedge real?*
2. **The USP core:** Epic 3 (approved lists) → Epic 4 (swap menu + choose/recompute) → Epic 8 (dietitian ratify/approve).
3. **The loop:** Epic 5 (logging + reconciliation) → Epic 6 (nudge) → Epic 9 (re-planning) → Epic 7 (patient app).
4. **Proof:** Epic 10 (lab loop + attribution) + Epic 11 (security).
5. **Demo:** Epic 13.
6. **Fast-follow:** Epics 12. **Scale/monetize:** Epic 14.

## Cross-Cutting Open Questions
- **[Data]** Baseline for the 70% North Star — resolved in approach (dose-response); needs pilot data (Epic 14.3).
- **[Eng]** Receipt OCR/normalization accuracy across retailers (Epic 1 — blocking).
- **[Clinical]** How does the agent screen approved-list items for comorbidities (Epic 3.2) — rules, or dietitian-only?
- **[Legal]** Threshold where a HIPAA path becomes required at scale? RTM/MNT billing prerequisites?
- **[Product]** Nudge frequency ceiling — is strictly weekly right, or condition-dependent?
