# Smart Savor — Readiness & Sanity Checks

*updated 2026-07-05 (reconciled with `smart-savor-demo-script.md`) · Status: v2*
*The bar for "ready." For the falsifiable hypotheses and how we test them, see `smart-savor-hypothesis.md`.*

---

## 1. Sanity Checks (gut-checks before declaring anything)

**Problem** — [ ] Real dietitians confirm *adherence* (not advice) is the pain? [ ] Would they use a
second tool alongside Healthie/Nutrium, or must it live inside one?

**Data** — [ ] Can it read a real, messy receipt (faded, crumpled, multi-retailer)? [ ] Does the
price×nutrient join match hard cases correctly? [ ] Prices/nutrients real, synthetic only for genuinely
missing fields?

**USP / recommendation** — [ ] When the patient picks a *different* food, does the recomputed amount
correctly close the same target? [ ] Is every item on the menu one the dietitian would actually
approve for *this* patient (comorbidity-safe)? [ ] Does choice feel real, not a fake dropdown?

**Reconciliation / honesty** — [ ] Does the dashboard move only on *logged* intake, never purchases
alone? [ ] Is it labeled "intake toward target," never "your blood level is rising"? [ ] Is the nudge
weekly and only on bought-but-not-logged items (not a daily firehose)?

**Demo** — [ ] Does the USP moment (choose → recompute → still-approved) land in <30s? [ ] Does Sam's
seeded story feel real, not fabricated?

---

## 2. Kill / Pivot Criteria

*(These fire when a load-bearing hypothesis in `smart-savor-hypothesis.md` is falsified.)*

- **Receipts can't be parsed reliably (H2)** → pivot input to logging-first, or reconsider the wedge.
- **Dietitians say advice, not adherence, is the problem (H1)** → framing is wrong; revisit.
- **Choice doesn't beat prescription (H3 fails)** → the USP is hollow; the product is just another
  swap calculator. Rethink the core bet before building further.
- **No dose-response signal (H5 fails)** → outcomes unprovable to payers; the moat is unfundable.
  Fix the measurement/adherence-signal design before pitching insurance.
- **Weekly nudge causes churn or is ignored (H4 fails)** → the consumption signal collapses; rethink
  cadence/format.
- **Receipt OCR turns out trivial** → the moat isn't ingestion; it's the outcome dataset — pivot the
  defensibility story (this is fine, just re-message).

---

## 3. Definition of Done

**Capstone-ready (Demo Day)**
- [ ] All P0 epics function end-to-end on ≥1 seeded patient: ingest → nutrient join → agent-drafted
  list → dietitian ratify → **patient choose → recompute → still-approved** → log/reconcile → weekly
  nudge → lab outcome.
- [ ] Food Matcher passes eval cases (incl. ambiguous negative).
- [ ] Gap Resolver passes eval cases, **including a choose-a-different-food → correct recomputed amount**.
- [ ] Custom MCP serves the stitched price×nutrient table; 3 source types wired.
- [ ] ≥2 multi-modal outputs (patient dashboard + PDF).
- [ ] Deployed on HTTPS w/ Clerk + cost cap; Langfuse traces visible.
- [ ] The USP moment demos cleanly without manual intervention.

**Product-ready (real pilot)**
- [ ] Receipt ingestion ≥80% success on *real* receipts from ≥3 patients.
- [ ] Dietitian ratify/approve rate ≥70%; patient swap-selection rate meaningfully positive.
- [ ] Swap coverage ≥85% of flagged gaps; weekly-loop engagement holds mid-cycle.
- [ ] ≥1 full 3-month cycle completed; the outcome + adherence loop works mechanically.

**Thesis-proven (fundable)**
- [ ] ≥70% of pilot patients (full denominator) show lab improvement at 3-month re-test.
- [ ] **Internal dose-response holds:** adherent > non-adherent improvement, significant at pilot N.

---

## 4. Open Questions (worth answering before pilot)
- **Comorbidity screening for approved lists** — hard rules, agent check, or dietitian-only? (safety)
- **Cold start:** patient with *no* receipts — manual entry, or skip to logging-first?
- **Price freshness / regional variation:** a national snapshot may mislead budget claims (B2C-relevant).
- **Privacy/consent:** receipts reveal alcohol, meds, lifestyle — consent model and who can see it?
- **Patient with no clear gap:** what does the product do (retention question)?
- **Liability:** approved swap × medication interaction — named, mitigated by ratification + comorbidity screen.
- **Nudge frequency ceiling:** is strictly weekly right, or condition-dependent?
- **Fulfillment (future, out of scope v1):** consent/payment model for Weekly Fresh Produce Fulfillment
  (EPIC 14.6); which retailer API (Instacart Health vs. Kroger); regional coverage; produce-prescription
  reimbursement prerequisites. Not a capstone concern — flagged for the Phase 3 expansion.

---

## 5. One-Line Readiness Verdict (fill in when checks are done)

> *Smart Savor is **[ready / not ready]** for **[Demo Day / pilot / pitch]** because
> **[which checks pass/fail]**. The single biggest open risk is **[X]**, and we'll know it's resolved
> when **[Y]**.*
