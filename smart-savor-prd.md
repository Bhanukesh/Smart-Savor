# PRD — Smart Savor *(working name)*

**Author:** Bhanu Balabhadrapatruni
**Status:** Draft v1
**Date:** 2026-06-27
**Related docs:** `smart-savor-product-brief.md` (strategy), `smart-savor-capstone-spec.md` (technical build)

---

## Problem Statement

Dietitians serving chronic-care patients don't have a "what diet to prescribe" problem — that advice is near-commodity. Their problem is **adherence and verification**: patients don't follow the prescribed diet, and the practitioner has zero visibility into real-life behavior between appointments, so they set targets and *hope*. With ~80% of healthcare spend tied to diet-related chronic disease, the cost of this blind spot is unmanaged conditions, wasted appointments, and no evidence the intervention worked. Smart Savor gives the dietitian a per-patient view of *prescribed targets vs. what the patient actually buys vs. whether the gap is closing*, with gap-closing, low-disruption swap suggestions they approve (affordability optional, reserved for B2C) and 3-month labs as ground truth.

## Goals

1. **Make patient behavior visible.** Give the dietitian an accurate eating-habit picture from real purchase history (not self-reported logs) for ≥80% of onboarded patients.
2. **Produce swaps patients actually adopt.** For each flagged nutrient gap, surface ≥3 low-disruption swaps ranked by gap-closing efficiency (cost shown as optional context, not enforced in B2B v1); achieve a dietitian approve-or-adjust rate ≥70%.
3. **Prove outcomes.** Demonstrate measurable lab improvement at 3-month re-test for ≥70% of patients on an active plan (North Star).
4. **Keep the clinician in control.** Every recommendation is practitioner-approved; zero auto-prescribed changes reach the patient without sign-off.
5. **Build the proprietary outcome dataset** that underwrites future white-label and insurance-reimbursement monetization.

## Non-Goals

1. **Not a diagnostic tool.** The agent never flags gaps or sets clinical targets — the licensed practitioner does. (Regulatory + trust risk; clinical authority must stay human.)
2. **Not direct-to-consumer.** The patient is the beneficiary and a data-entry surface, never the buyer. (DTC reintroduces the adherence death-spiral and kills the lab/insurance thesis.)
3. **No live retail/POS integration (v1).** No Walmart/Instacart API. Purchase data comes from uploaded receipts. (Integrations are high-friction and not needed to prove the loop.)
4. **No real multi-tenant SaaS / patient self-onboarding (capstone/MVP).** Seeded patients only for demo; real auth and data isolation are later. (Premature for validation.)
5. **No HIPAA-compliance claim (v1).** Security-conscious design (encryption + Clerk-gated access) without certifying compliance. (Certification is a separate, later workstream.)

## User Stories

### Dietitian (primary user)
1. As a dietitian, I want to **enter a patient's flagged nutrient gaps and constraints** (restrictions, dislikes, weekly budget) so the agent works toward closing the right gaps within real-world limits.
2. As a dietitian, I want to **see a patient's actual buying behavior next to their prescribed targets** so I know whether they're following the plan without relying on what they tell me.
3. As a dietitian, I want **≥3 ranked swap suggestions per gap** (most gap-closing + closest to current habits) so I can quickly pick effective options instead of building plans from scratch.
4. As a dietitian, I want to **approve or adjust each suggested swap** so I stay in clinical control of what reaches my patient.
5. As a dietitian, I want a **gap-closing trend over time** so I can see whether the intervention is working between lab tests.
6. As a dietitian, I want to **generate a PDF weekly plan + shopping list** I can hand the patient so the advice is actionable.
7. As a dietitian, I want to be **notified when a patient uploads a new lab or new receipts** so I can review and re-plan promptly.

### Patient (beneficiary / data-entry surface)
8. As a patient, I want to **upload 3–5 months of grocery receipts** (Costco/Walmart/any) so the system learns my real eating habits without daily logging.
9. As a patient, I want to **optionally log food via photo or voice** so I can fill gaps between receipt uploads in whatever way is easiest.
10. As a patient, I want to **choose which foods I'd prefer** to close a given gap so the plan reflects what I'll actually eat.

### Edge / boundary
11. As a dietitian, when a patient's receipts are **unreadable or sparse**, I want a clear "insufficient data" state so I don't act on a false picture.
12. As a dietitian, when **no food meaningfully closes a gap within constraints**, I want to be told explicitly rather than see a silently weak plan.

## Requirements

### Must-Have (P0)
- **P0.1 — Receipt ingestion → habit model.** Patient uploads receipts (image/PDF); system extracts line items and builds a normalized eating-habit model.
  - *Given* a patient uploads ≥3 months of legible receipts, *when* processing completes, *then* the system produces a per-patient purchase-frequency profile mapped to nutrient-relevant food categories.
  - Negative: unreadable/sparse receipts surface an explicit "insufficient data" state, not a fabricated profile.
- **P0.2 — Nutrient–price join (Food Matcher).** Resolve a product name to the correct USDA FDC entry so nutrients attach to price (fuzzy/semantic match).
  - *Given* a grocery product name, *when* matched, *then* it resolves to the correct FDC food id (validated by eval cases incl. one ambiguous negative).
- **P0.3 — Gap-resolver swaps.** Given flagged gaps + current diet + constraints, return ≥3 ranked swaps per gap, scored by gap-closing efficiency (most target nutrient per serving) and disruption (closeness to existing habits). Cost is an optional, non-enforced signal (reserved as a B2C lever).
  - *Given* a flagged gap, *when* the agent plans, *then* it ranks foods by how fast they close the gap and prefers foods near existing habits.
  - *Given* no food meaningfully closes the gap within constraints, *then* the system reports it explicitly.
  - *Given* the optional affordability view is requested, *when* the agent ranks, *then* it can sort by cost without changing the data model.
- **P0.4 — Practitioner dashboard (prescribed vs. actual vs. trend).** Per-patient view with prescribed targets, actual buying behavior, and gap-closing trend.
- **P0.5 — Approve / adjust gesture.** Dietitian approves or edits each suggested swap; nothing reaches the patient plan without sign-off.
- **P0.6 — Background re-planning.** Regenerate plan weekly and re-plan on changed inputs: new lab uploaded (headline trigger), new receipt logged, budget edited, item marked disliked/unavailable, price snapshot refreshed.
- **P0.7 — Lab capture + outcome record.** Record baseline and 3-month re-test labs; link to the active plan to compute improvement.
- **P0.8 — Security-conscious access.** Encryption + Clerk-gated access to health data.

### Nice-to-Have (P1)
- **P1.1 — PDF weekly Nutrient Correction Plan + deduped shopping list** (WeasyPrint).
- **P1.2 — Photo/voice food logging** for between-receipt intake.
- **P1.3 — Email digest** to practitioner/patient on plan changes or new report (Resend).
- **P1.4 — Patient food-preference selection** feeding the ranker.

### Future Considerations (P2)
- **P2.1 — White-label deployment** for clinics / chronic-care programs.
- **P2.2 — Insurance reimbursement code support** built on accumulated outcome data.
- **P2.3 — Real multi-tenant SaaS:** patient self-onboarding, data isolation, full auth.
- **P2.4 — Live retail/POS or loyalty-card integration** to replace manual receipt upload.
- **P2.5 — Control/comparison cohort** to benchmark the 70% improvement claim.

## Success Metrics

### Leading indicators (days–weeks)
- **Receipt ingestion success rate:** ≥80% of patients get a usable habit model from uploaded receipts. *(success)* / ≥90% *(stretch)*.
- **Swap approve-or-adjust rate:** ≥70% of suggested swaps are approved or lightly adjusted (not discarded).
- **Swap coverage:** % of flagged gaps with a viable gap-closing swap ≥85%. (Affordability coverage tracked separately, for the B2C path.)
- **Plan generation latency:** weekly plan generated in <X sec (pre-computed join keeps runtime fast — define X in build).

### Lagging indicators (weeks–months)
- **North Star — 3-month lab improvement:** ≥70% of patients on an active plan show measurable improvement at re-test. *(Requires a baseline/comparison to be credible — see P2.5 / Open Questions.)*
- **Dietitian retention:** % of pilot dietitians still active after 3 months.
- **Projected cost delta:** average weekly grocery cost delta vs. patient's current diet (should be ≤0 — closing gaps without raising spend).

## Open Questions
- **[Data] What is the baseline/control for the 70% claim?** "70% improve vs. what standard-care rate?" — blocking for investor/payer credibility, non-blocking for build.
- **[Engineering] How hard is robust receipt OCR + line-item normalization across retailers?** This is the core wedge; validate accuracy early. *(Blocking for P0.1 confidence.)*
- **[Data] Imputation policy:** which fields may be synthetically imputed (e.g. pack size) vs. must be real? Confirm prices/nutrients always real.
- **[Legal] At what point does the health-data handling require a HIPAA-compliance path** rather than just security-conscious design? *(Non-blocking for MVP, blocking before real patient data at scale.)*
- **[Stakeholder] Lab re-test logistics:** who orders/pays for the 3-month labs in the pilot, and what does the dashboard show in the gap between labs? *(Assumed: purchasing proxy is the between-labs signal.)*
- **[Product] Receipt cadence:** uploads are batch/retrospective — is a monthly dashboard refresh acceptable, or do we need photo/voice logging (P1.2) at MVP to feel "live"?

## Timeline Considerations

**Capstone deadline:** tentatively **14 August 2026** (~7 weeks from 2026-06-27). Tight but workable on a riskiest-first order.

### Week-by-week (Demo Day plan)
| Week | Focus | Output |
|---|---|---|
| **Wk 1** | Collect a handful of real, messy receipts; set up Google Form → Sheet metadata intake; repo + custom MCP scaffold (done) | Real receipts in hand; live metadata pipeline |
| **Wk 2** | ⚠️ **Spike the riskiest layer:** receipt ingestion accuracy (Claude vision) + offline nutrient join. *Go/no-go gate.* | Validated ingestion + join, or a known pivot |
| **Wk 3–4** | Lean-4 agents (Ingestion → Prioritization → Swap Sourcing → Orchestrator) + Skills A/B with eval suites | Working agent loop on seeded data |
| **Wk 5** | UI on seeded data: D1.5 → D2 → D3 (the "aha" path) | Clickable hero flow |
| **Wk 6** | Outputs (PDF), Clerk + Langfuse + deploy at `<student>.apps.human-angle.com` + cost cap | Deployed, traced, gated |
| **Wk 7** | Demo-story polish, rehearse the "aha," buffer for slippage | Demo Day ready |

**Data note:** seeded/fake data is acceptable for *visualization* (profiles, gaps, trends, swaps). The **one exception is receipt ingestion**, which needs a few real, messy receipts to prove parsing — no medical story attached. Targets layered on top are honestly "seeded targets," not real labs.

### Longer-horizon phases (beyond capstone)
- **Phase 1 — Real pilot (free to dietitians):** real receipt ingestion, real patients via private-practice on-ramp, capture first 3-month outcome data.
- **Phase 2 — Monetization:** white-label + insurance reimbursement, contingent on proven outcomes from Phase 1.

**Critical dependency:** P0.1 receipt-ingestion accuracy gates everything — the Wk-2 spike de-risks it before the UI is built on top. Collect receipts in Wk 1 so data-gathering never blocks the Wk-2 gate.

---

*Next artifacts available on request: engineering ticket breakdown, design brief for the practitioner dashboard, or an investor pitch version.*
