# Smart Savor — Readiness, Hypotheses & Sanity Checks

*2026-06-27 · A standalone answers doc: hypotheses to test, checks to run, and the bar for "ready."*

---

## 1. Hypotheses (what we're betting is true)

State each as falsifiable. If we can't prove it, the product doesn't work.

- **H1 — Behavior is the real problem.** Dietitians' patients fail because of *adherence*, not bad advice. → If true, a tool that reveals behavior beats one that generates plans.
- **H2 — Receipts reveal eating habits.** Grocery receipts are an accurate-enough proxy for what a patient actually eats. → If false, the whole input is garbage-in.
- **H3 — Affordable, low-disruption swaps get adopted.** Patients will follow swaps that are cheap and close to their current habits, where they ignored generic advice.
- **H4 — Labs prove it.** A 3-month re-test will show measurable improvement for patients on an active plan (target ≥70%).
- **H5 — Dietitians want this.** Dietitians will use (and eventually pay for / let a payer pay for) a tool that shows behavior and proves outcomes.
- **H6 — The join is defensible.** Linking real grocery prices to real nutrient data (cost-per-nutrient) is genuinely hard to copy and useful.

**Riskiest first:** H2 (receipts → habits) and H1 (adherence is the problem). If either is wrong, the product premise collapses — test these before building far.

---

## 2. Sanity Checks (gut-checks before declaring anything)

**Problem sanity**
- [ ] Have I talked to a real dietitians who confirm adherence (not advice) is the pain?
- [ ] Would a dietitian use a *second* tool alongside Healthie/Nutrium, or does this need to live inside one?

**Data sanity**
- [ ] Can the system actually read a real, messy receipt (faded, crumpled, multi-retailer) — not just a clean sample?
- [ ] Does the price×nutrient join produce *correct* matches on hard cases (e.g. "Fresh Green Bell Pepper, Each" → right USDA entry)?
- [ ] Are prices and nutrients real, with synthetic data only for genuinely missing fields (e.g. pack size)?

**Recommendation sanity**
- [ ] Are the swaps actually cheaper per unit of nutrient, in-budget, and close to habits — or just technically valid?
- [ ] Does a real dietitian look at a suggested swap and say "yes, I'd approve that"?

**Honesty sanity**
- [ ] Am I claiming "the gap is closing" when I only observe *purchases*? (Purchases = proxy; labs = truth. Don't overclaim.)
- [ ] Is the dashboard refresh cadence honest (batch/monthly from receipts, not real-time)?

**Demo sanity**
- [ ] Does the "aha" land in <30 seconds: *patient keeps buying X; for the same money, Y closes the gap*?
- [ ] Does the seeded-patient story feel real, not fabricated?

---

## 3. How to Conclude the Product Is Ready (Definition of Done)

Ready = these are all true. Not-ready = any P0 check fails.

**Capstone-ready (Demo Day)**
- [ ] All P0 epics function end-to-end on ≥1 seeded patient (ingest → match → rank → approve → re-plan → lab outcome).
- [ ] Food Matcher passes its eval cases (incl. the ambiguous negative).
- [ ] Gap Resolver passes its eval cases (vit C/banana, iron/vegetarian, budget-capped).
- [ ] Custom MCP serves the stitched price×nutrient table; 3 source types wired.
- [ ] ≥2 multi-modal outputs work (dashboard + PDF).
- [ ] Deployed on HTTPS w/ Clerk + cost cap; Langfuse traces visible.
- [ ] The "aha" screen demos cleanly without manual intervention.

**Product-ready (real pilot, beyond capstone)**
- [ ] Receipt ingestion ≥80% success on *real* receipts from ≥3 patients.
- [ ] Swap approve/adjust rate ≥70% with a real dietitian.
- [ ] In-budget coverage ≥85% of flagged gaps.
- [ ] At least one 3-month lab cycle completed showing the outcome loop works mechanically.

**Thesis-proven (fundable)**
- [ ] ≥70% of pilot patients show lab improvement at 3-month re-test, vs. a defined baseline.

---

## 4. Riskiest Assumptions → How to Test Each (cheapest first)

| Assumption | Cheap test | Pass signal |
|---|---|---|
| Receipts → habits (H2) | Run OCR+normalize on 10 real receipts | ≥80% line items correctly parsed & categorized |
| Adherence is the pain (H1) | 3 dietitian interviews (Mom Test style) | They describe adherence unprompted as the #1 frustration |
| Swaps get adopted (H3) | Show 5 swaps to a dietitian + patient | They'd actually buy/approve them |
| Join is hard/useful (H6) | Build the matcher, score on hard cases | High match accuracy AND non-trivial to replicate |
| Dietitians want it (H5) | Offer free pilot to private-practice RDs | ≥1 says yes and onboards a patient |

---

## 5. Kill / Pivot Criteria (when to stop or change direction)

- **Receipts can't be parsed reliably** → pivot input method (photo logging) or reconsider the wedge.
- **Dietitians say advice, not adherence, is the problem** → the whole framing is wrong; revisit.
- **Swaps are technically valid but no one would eat them** → the disruption/affordability scoring is the real product; refocus there.
- **No baseline for the 70% claim exists** → outcome story is unprovable to payers; fix before pitching insurance.
- **Receipt OCR turns out trivial** → the moat isn't ingestion; it's the outcome dataset — pivot the defensibility story.

---

## 6. Questions I'd Ask (and ones you may have missed)

**Already raised in our sessions**
- What's the baseline for "70% improvement"? (70% vs. what?)
- How hard is receipt OCR really? (gates everything)
- What does the dashboard show *between* labs?
- Who orders/pays for the 3-month pilot labs?
- Is a monthly refresh acceptable, or is logging needed at MVP?

**Possibly missed — worth answering before pilot**
- **Cold start:** What if a new patient has *no* receipts? (manual entry? skip to logging?)
- **Data freshness:** Prices come from a 2022 Kaggle snapshot — how stale is too stale, and does it mislead budget claims?
- **Regional/store variation:** Prices differ by store and region; does a national snapshot break the budget promise?
- **Privacy/consent:** Receipts reveal alcohol, medications, lifestyle — what's the consent model, and who can see it?
- **Patient with no clear "gap":** What does the product do for a patient whose labs are fine? (retention question)
- **Dietitian time cost:** How many minutes per patient does this add or save? (adoption killer if it adds work)
- **Liability:** If an approved swap interacts badly with a medication, who's responsible? (clinical-authority framing helps, but name it)
- **Multi-condition patients:** Conflicting needs (low sodium + high iron) — does the ranker handle trade-offs?
- **Measurement integrity:** How do we prevent "70%" from being cherry-picked (only counting patients who re-test)?

---

## 7. One-Line Readiness Verdict (fill in when checks are done)

> *Smart Savor is **[ready / not ready]** for **[Demo Day / pilot / pitch]** because **[which checks pass/fail]**. The single biggest open risk is **[X]**, and we'll know it's resolved when **[Y]**.*
