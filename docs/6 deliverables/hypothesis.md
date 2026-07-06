# Smart Savor — Falsifiable Hypotheses & Test Plan

*updated 2026-07-05 (reconciled with `smart-savor-demo-script.md`) · Status: v1*
*What we're betting is true, and how we'll try to prove it false. Companion: `smart-savor-readiness.md` (sanity checks, DoD, kill criteria).*

---

## 1. Hypotheses (what we're betting is true)

Each is stated so it can be **proven false**. If we can't prove it, the product doesn't work.

- **H1 — Behavior is the real problem.** Chronic patients fail on *adherence*, not bad advice.
  → *Falsified if* dietitians say advice (not follow-through) is their #1 frustration.
- **H2 — Receipts reveal purchase habits.** Grocery receipts are an accurate-enough model of what a
  patient *buys*. → *Falsified if* OCR+normalization can't parse real messy receipts reliably.
- **H3 — Choice drives adherence (THE USP).** Patients who **choose** their food from a bounded,
  dietitian-ratified menu adhere better than patients handed a prescriptive plan. → *Falsified if*
  swap-selection/adherence is no better than (or worse than) prescriptive advice. **This is the
  core product bet — if choice doesn't beat prescription, the USP is just UX theater.**
- **H4 — Logs + nudge close the purchase→consumption gap.** Light photo/voice logging plus a weekly
  (never daily) nudge yields a trustworthy *consumption* signal without triggering logging-fatigue
  churn. → *Falsified if* patients stop logging/responding, or self-report proves too noisy to trust.
- **H5 — The app is causally responsible for lab improvement.** Split into two links:
  - **Link B (intake → biomarker)** is *established nutritional science* — we do NOT need to prove it.
  - **Link A (Smart Savor → intake behavior)** is the ONLY link we must prove.
  → *Falsified if* adherent patients don't improve more than non-adherent ones (no dose-response).
- **H6 — Dietitians want it AND it saves them time.** RDs will adopt (and eventually let a payer pay
  for) a tool where the agent drafts and they only ratify. → *Falsified if* it adds net work per
  patient, or no private-practice RD onboards a patient in a free pilot.
- **H7 — The moat is real.** The receipt→habit→nutrient-join pipeline is hard to copy short-term, and
  the **condition-specific outcome dataset** is the durable, compounding moat. → *Falsified if*
  ingestion turns out trivial AND the outcome data proves easy for incumbents to replicate.
- **H8 — Vertical focus wins.** Depth in one condition (Type 2 + cardiac risk) beats breadth —
  tractable approved-list templates, faster outcome data. → *Falsified if* the condition is too
  narrow to reach enough patients, or templates don't generalize across patients in it.

**Riskiest first:** **H1, H2, H3** (is choice actually better?), then **H5** (attribution). If H1 or
H2 is wrong the premise collapses; if H3 is wrong the USP is hollow; if H5 is wrong the moat is unfundable.

- **H9 — Fulfillment lifts adherence (FUTURE — out of scope for v1).** Auto-ordering the week's approved
  fresh produce to the patient's door (Weekly Fresh Produce Fulfillment, EPIC 14.6) raises adherence
  vs. telling them what to buy. → *Falsified if* delivered patients don't eat/adhere more than
  self-shopping patients. Test when the Phase 3 fulfillment feature exists, not at capstone.

---

## 2. The Attribution Test Plan (the crux — H5)

This is the hardest and most valuable thing to get right. Full reasoning in
`smart-savor-demo-script.md` → "Answers to open risks → #5." Summary of the plan:

**The reframe that shrinks the problem:** don't try to prove biochemistry (Link B — settled). Prove
only that **Smart Savor changes intake behavior** (Link A). That's a behavioral claim, cheaply testable.

**The evidence ladder — cheapest to most rigorous:**

| Rung | Design | What it controls | Cost |
|---|---|---|---|
| 1 | **Internal dose-response** — do *adherent* patients (confirmed-log consumption of gap-closing foods) improve **more** than *non-adherent* ones? | Kills placebo, Hawthorne, regression-to-the-mean in one shot (all hit both groups equally; a *differential* effect can't be explained by them) | ~free — uses data we already collect |
| 2 | **Within-patient pre/post** — each patient is their own baseline (≥2 pre-enrollment labs) | Stable patient traits; blunts regression-to-mean | low |
| 3 | **Stepped-wedge rollout** — staggered onboarding; not-yet-onboarded are a rolling control | Time trends, secular effects; ethical (everyone eventually gets it) | medium |
| 4 | **Matched/synthetic control → RCT** | Full confounding | high — payer-funded, later stage |

**Confounder handling:** capture meds at intake and stratify/exclude mid-cycle med changes; require a
stable baseline.

**Measurement integrity (guard against a cherry-picked 70%):** define the denominator up front —
count **all** patients on an active plan, not just those who re-test. Report re-test rate separately.
Pre-register the improvement threshold per gap before looking at results.

**Positioning ladder — never overclaim:** *"promising dose-response signal within our cohort"* →
*"stepped-wedge pilot"* → *"matched-control study"* → *"payer-funded RCT."* Say "proven" only from rung 3.

---

## 3. Riskiest Assumptions → How to Test Each (cheapest first)

| Assumption | Cheap test | Pass signal |
|---|---|---|
| Adherence is the pain (H1) | 3 dietitian interviews (Mom Test style) | They name adherence unprompted as #1 |
| Receipts → purchase model (H2) | OCR+normalize 10 real receipts | ≥80% line items correctly parsed & categorized |
| **Choice beats prescription (H3)** | Show the choose→recompute menu to RDs + patients; A/B vs. a prescriptive plan | Patients select actively; RDs believe it lifts adherence; measurable selection rate |
| Logs+nudge sustain a consumption signal (H4) | Run the weekly loop on a pilot patient for a month | Response rate holds; consumption confidence usable |
| **App drives behavior (H5)** | Compute internal dose-response on pilot data | Adherent patients improve measurably more than non-adherent |
| Dietitians want it / saves time (H6) | Free pilot to private-practice RDs; time-per-patient study | ≥1 onboards a patient; net time-neutral or saved |
| Join is hard/useful (H7) | Build matcher, score hard cases | High accuracy AND non-trivial to replicate |

---

## 4. What Falsification Triggers

If a load-bearing hypothesis fails, see `smart-savor-readiness.md` → "Kill / Pivot Criteria." In brief:
H1 or H2 false → premise collapses; **H3 false → the USP is hollow (rethink the core bet)**;
**H5 false → outcomes unprovable to payers (the moat is unfundable)**; H4 false → the consumption
signal collapses (rethink the loop).
