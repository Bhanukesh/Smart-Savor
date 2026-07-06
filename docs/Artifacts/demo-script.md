# Smart Savor — Demo Script

*2026-07-05 · Scene-by-scene walkthrough for the capstone demo. Each beat is tagged
with the agent/screen that powers it, so this doubles as the build backlog for the
end-to-end path.*

---

## The one-liner

> **Your doctor tells your body what it needs. You decide what's on your plate.**
> Smart Savor turns a clinical prescription into a menu the patient actually enjoys —
> and proves, at the 3-month re-test, that it worked.

## Framing

- **Product framing (A): B2B, humanized.** We still sell to the dietitian (Maria); the
  demo spends most of its screen time on the patient (Sam) to make the value *felt*.
  The patient view carries the emotion; the dietitian view carries the credibility.
- **Cast:** **Sam** — 54, Type 2 diabetic (secondary persona, the beneficiary).
  **Maria** — registered dietitian (primary persona, the buyer and clinical authority).
- **Emphasis:** patient view > dietitian view. Keep the dietitian acts tight; linger on
  Sam's experience and on the swap-choice moment (Act 2, screens 5a–5c).

---

## The USP — how swaps actually work

The centerpiece. The doctor prescribes the *requirement*, not the food. The patient
chooses the *source*; the agent solves for the *amount*.

| Owned by | Variable | Fixed or free? |
|---|---|---|
| **Doctor** | The nutrient target (**X**) | **Fixed** — clinical, non-negotiable |
| **Patient** | Which food delivers it (the source) | **Free — within the dietitian's pre-approved list for that gap** |
| **Agent** | How much of that food (**Y**) closes X | **Computed** — per-food, since nutrient density differs |

Every food carries a different amount of the target nutrient per serving, so the *source*
is a free choice and only the *quantity* changes. Different food → different Y, **same X**.
Sam always closes the exact gap Maria set — just from a source he enjoys.

**The choice is bounded, so it's safe by construction.** Sam doesn't pick from the whole
food universe — he picks from a **per-gap menu the agent drafts and the dietitian ratifies**.
That means he can't accidentally choose a food that closes his magnesium gap while spiking
his glucose or potassium (he's Type 2, cardiac risk): if it's clinically wrong for him, it
was never on the menu. "Free choice" = *free within a clinically-bounded set*.

Because Smart Savor targets a **specific condition**, that menu is largely a reusable
**condition × gap template** — the agent drafts it (personalized for the patient's dislikes,
restrictions, and comorbidities) and Maria only **ratifies** it, rather than authoring a list
per patient from scratch. Agent drafts → dietitian ratifies → patient chooses. The diet stops
being a prescription he endures and becomes a menu he picks from. That is the adherence win
the North Star (≥70% show lab improvement at re-test) depends on.

**It's already in the code:** `query_nutrient_sources` ranks foods by `gap_efficiency`
(nutrient-per-serving), so the ranking *is* the "how much do I need" math. `dislikes` /
`restrictions` filtering means the menu Sam chooses from is pre-filtered to foods he'd
actually eat — "eat what you like," enforced in the store.

---

## The pipeline (also the build order for workstream #2)

```
intake (BUILT) → prioritization → receipt → swap → re-test
```

| Beat | Powered by | Status |
|---|---|---|
| Act 1 · profile auto-fill | Agent 1 — Patient Intake Ingestion | **built** (`intake_agent.py`) |
| Act 1 · confirm focus set | Agent 3 — Cycle Prioritization | prompt only |
| Act 2 · upload receipts | Agent 2 — Ingestion: Receipts + Logs | prompt only |
| Act 2 · the swap menu | Agent 4 — Swap Sourcing (`query_nutrient_sources`) | prompt only; store implemented |
| Act 2 · macro/mineral dashboard | **net-new UI** — targets trending into range | not spec'd |
| Act 2.5 · photo logs + weekly nudge | Agent 5 — Nudge / Adherence (net-new) | not spec'd |
| all · keeps the plan current | Agent 6 — Re-planning Orchestrator (`weekly_cron`, `new_receipt`) | prompt only |

---

## Cold open — the stakes (10 sec, no UI)

> *"Sam is 54, Type 2 diabetic. That makes him 2–4× more likely to develop or die from
> heart disease. His blood pressure and cholesterol are creeping up. His dietitian knows
> exactly what he should eat — the problem isn't the advice, it's that nobody knows if Sam
> actually follows it. Eating clean — the right macros, healthy fats, and his key vitamins
> and minerals in range — is what controls his BP and cholesterol. Here's how Smart Savor
> makes that something he'll actually do."*

This single line justifies every macro / vitamin / mineral target that appears later — the
numbers aren't abstract, they're cardiac risk.

---

## Act 1 — Dietitian view (tight: the "trust" layer)

Keep this short. Its only job is to prove a clinician is behind everything Sam sees.

1. **Sam's intake lands.** Maria opens Sam's profile, auto-filled from his intake document.
   Fields carry confidence flags; blanks are marked `needs_review`, never fabricated.
   *(Agent 1 — built.)*
2. **Maria confirms the gaps.** From Sam's labs she flags the clinically relevant gaps —
   fiber & magnesium (glycemic control), potassium (BP), holding saturated fat down (LDL).
   *She* owns this call; the app drafts a focus set, she ratifies. *(Agent 3.)*
3. **One click** to approve the focus set. Done. Takeaway: *a human she trusts is behind
   every recommendation Sam will see.*

---

## Act 2 — Patient view (the emphasis: most screen time here)

Framed as "eat better for your condition without changing your whole life or budget."

4. **Upload, don't log.** Sam photographs his last few grocery receipts. No food diary —
   "get credit for what you already buy." *(Agent 2 — receipt-to-habit ingestion, the wedge.)*

**The USP moment — give it three beats, don't bury it in one card:**

5a. **The menu (agent-drafted, dietitian-ratified).** Maria's flagged an **iron gap**. Smart
   Savor shows Sam a ranked menu of foods that close it — drafted by the agent from the
   condition template, personalized to Sam, and **ratified by Maria**, so anything clinically
   wrong for him was never on the list. "Here are 5 ways to hit your target; pick what sounds good."
   - **Lentils** — most iron per serving → closes the gap in the fewest servings. *"1 cup covers it."*
   - **Spinach** — less dense → *"you'll need ~2.5 cups for the same target."*
   - ~~White rice~~ — filtered out (disliked / doesn't close the gap).

5b. **Sam chooses spinach** (he likes it better). The app instantly recomputes the amount:
   *"Great — 2.5 cups a week does it."* Same iron target, a food he'll actually eat.

5c. **It's still Maria's target.** The card shows the doctor's gap fully closed and carries
   her sign-off. **Choice for Sam, control for Maria.** *(Agent 4 — the headline.)*

> The `choose → recompute → still-approved` loop is the single most demo-able moment in the
> product. It's where the audience *sees* the USP instead of hearing it.

6. **The macro / mineral dashboard.** Sam sees fiber, healthy fats, potassium, and his key
   vitamins/minerals tracking **toward the in-range bands** Maria set — a simple gauge per
   target, green when in range. This is where "macros appropriately, healthy fats, vitamins
   & minerals in range" becomes a *screen*. *(Net-new UI — the one real new build here.)*
   > **Honesty guardrail:** the gauge represents **confirmed intake toward target**
   > (behavior — driven only by *logged* foods, never by purchases alone), **not** a
   > between-labs blood level. Label it "you're eating your way toward the gap," never
   > "your magnesium is rising." Physiology is only known at the 3-month re-test.

7. **"Your dietitian approved this."** Every card carries Maria's sign-off. Sam trusts it
   because a human he trusts stands behind it.

---

## Act 2.5 — Closing the visibility gap (the weekly loop)

The core problem between visits: **Maria has no idea what Sam actually eats.** Receipts
prove what he *bought* — spinach in the cart isn't magnesium in his body. This loop turns
purchase into confirmed consumption, without the daily-logging chore that makes patients quit.

**The key reframe: receipts are the *purchase* signal; the logs are the *consumption*
signal.** Smart Savor's job is to **reconcile the two** — "you bought spinach; did you
actually eat it, or did the money go to waste?" That reconciliation is the product: the
logs (photo/voice/text) are Sam's *personal* confirmation of consumption (which also settles
the "who in the household ate it" question — a log is *his* act, not the family cart), and
the receipt is just the purchase side we check them against. We are the ones who tell Maria
whether *purchase = consumption* for this patient.

**A three-rung signal ladder — effort escalates only when the cheaper signal is silent:**

1. **Receipts** — passive, zero effort. What he *bought*. *(Agent 2.)*
2. **Photo logs** — low effort, opt-in, when *he* wants. What he *actually ate*.
   "Photo or voice, not forms."
3. **The weekly smart nudge** — the fallback when logging lapses. Not "you forgot to log."
   It ties the exact food we know he bought to the exact clinical goal:
   > *"Did you get to have the spinach last week? Just checking — it's your fastest way to
   > close that magnesium gap."*

**The nudge fires on exactly one condition: bought-but-not-logged.** We only ask about
spinach because (a) it's on his **receipts** and (b) it never showed up in a **photo, voice,
or text log**. That gap — purchased, consumption unconfirmed — is the *only* trigger. If he
already logged it, we stay silent; if he never bought it, we don't ask. This is what keeps
nudges rare and relevant: we only chase the one signal we're actually missing.

What makes the nudge land rather than nag: it references **what we already know he bought**
(plausible and personal) and it's **framed as help toward his goal**, not surveillance.

**Cadence is deliberate: weekly, never daily.** Daily-logging dependence is Sam's #1 churn
risk in the persona doc — the restraint is a feature. It's a gentle, enforced, weekly
feedback loop, not a notification firehose.

**Honesty nuance — confidence by source.** A nudge-confirmed "yes" is softer evidence than
a photo. Rank consumption confidence: photo > nudge-confirmed > inferred-from-receipt.
Maria sees *how* the app knows, not just that it thinks it knows — consistent with the
no-fabrication principle (`needs_review`, honest about missing data).

**What Maria gets:** a between-visit adherence read (her sub-job #3, "see behavior between
visits") — the thing charting tools can't give her. *(Orchestrated by Agent 6 on its
`weekly_cron` and `new_receipt` triggers.)*

---

## Act 3 — The payoff (the North Star)

8. **3-month re-test.** Sam's follow-up labs come back. The dashboard shows fiber up,
   magnesium in range, LDL trending down, BP improving. **Both** views celebrate it:
   - **Maria** has *proof her plan worked* — outcomes she can show patients, programs, payers.
   - **Sam** sees *cardiac risk actually moving* — a callback to the cold open, stakes resolved.

Behind the scenes, Agent 6 (Re-planning Orchestrator) is what kept the plan current between
visits — re-sourcing swaps as new receipts and prices arrived.

---

## Why this shape works

- The **patient view carries the emotion**, the **dietitian view carries the credibility** —
  "delightful *and* safe" without the two competing for time.
- It exercises the agents in dependency order (intake → prioritize → receipt → swap →
  re-test), so the demo narrative *is* the build backlog for workstream #2.
- The swap-choice loop (5a–5c) makes the USP visible; the re-test (Act 3) makes the North
  Star visible. Those are the two beats to rehearse hardest.

## Future roadmap teaser (say it, don't build it)

**Weekly Fresh Produce Fulfillment — the signature differentiator (out of scope for the demo).** Close
the loop one step further: once Maria ratifies and Sam chooses, Smart Savor **auto-orders his week of
fresh produce (fruits & vegetables) to his door, one week at a time.** Eating right drops to zero extra
effort — the ultimate adherence lever. v1 is a consent-first one-tap cart hand-off (Instacart Health /
Kroger); it unlocks **"Food is Medicine" produce-prescription reimbursement** (the payer funds the
groceries). *Not built for the capstone — but it's the line that makes the vision land: "we don't just
tell you what to eat; we put it on your doorstep."* Powered by a future Agent 7 (Fulfillment).

## Open risks (investor stress-test)

Resolved in the flow above:
- **Purchase ≠ consumption** — reframed: receipts = purchase signal, logs = consumption
  signal, the app reconciles the two (Act 2.5). Logs also settle household attribution.
- **Inferred dashboard** — gauge shows *confirmed-log intake toward target*, never a
  between-labs blood level (screen 6 guardrail).
- **Clinically unsafe "free" choice** — bounded to a per-gap menu the **agent drafts and the
  dietitian ratifies** (USP section + screen 5a): safe by construction.
- **Dietitian time (#6)** — solved by *vertical focus + agent-drafted lists*. Targeting one
  condition makes the approved list a **condition × gap template** (roughly the same across
  patients), which the **agent drafts** and Maria only **ratifies** — collapsing her job from
  authoring-per-patient to sign-off. *Guardrail:* the dietitian-ratification step stays
  (that's what preserves the #4 safety guarantee and keeps this "agent-assisted clinician,"
  not "algorithm prescribing to a diabetic"), and the agent must **personalize for
  comorbidities** (Sam is T2D *with cardiac risk*, not T2D alone).
- **Post-cycle retention (#9)** — reframed: chronic conditions are *managed, not cured*, so
  the 3-month checkpoint loop **repeats for the life of the condition** = recurring engagement
  (a feature, not a churn cliff — avoid "till cured" framing). The **weekly nudge loop
  (Act 2.5)** carries mid-cycle engagement between checkpoints; the checkpoint re-anchors and
  proves progress. Remission is a celebration moment, not the exit.

Answered below (see "Answers to open risks") — each has a defensible response now:
- **⚠️ Attribution (#5)** — the load-bearing one; answered via the two-link reframe +
  internal dose-response.
- **Self-report noise for payers (#3)** — answered via triangulation + confidence-weighting.
- **Pricing / buyer (#7)** and **moat timing (#8)** — answered via existing reimbursement
  rails and a compounding condition-specific dataset.

## Answers to open risks

The defensible version of each answer, for the pitch and for the build roadmap.

### #5 — Attribution: prove one link, not two

**The reframe that shrinks the whole problem: split the causal chain and notice you only
have to prove one link.**

- **Link B — intake → biomarker** ("more magnesium raises serum magnesium; more fiber
  improves glycemic markers"). This is **established nutritional science** — decades of
  literature already prove it. *You do not need to.* Stop trying to prove biochemistry.
- **Link A — Smart Savor → intake behavior** ("our app actually gets the patient to eat the
  gap-closing food"). **This is the only thing you must prove**, and it's a *behavioral*
  claim — far cheaper to evidence than a clinical one.

**How to prove Link A causally — a ladder from cheap to rigorous:**

1. **Internal dose-response (the killer cheap card).** Compare **adherent vs. non-adherent
   patients within your own cohort** using the confirmed-log adherence signal you already
   collect: do patients who actually ate the swaps improve *more* than those who didn't?
   A dose-response that tracks adherence **kills placebo, Hawthorne, and regression-to-the-
   mean in one shot** — all three hit both groups equally, so a *differential* effect by
   adherence can't be explained by "everyone was being watched" or "everyone drifts back."
   Costs nothing but the analysis.
2. **Within-patient pre/post.** Each chronic patient has a pre-Smart-Savor lab trajectory and
   is their own baseline. Use ≥2 pre-enrollment labs to blunt regression-to-the-mean.
3. **Stepped-wedge rollout.** Onboard in staggered cohorts; the not-yet-onboarded are a
   rolling control. Accepted in health-services research *because* everyone eventually gets
   the intervention (ethical; dietitians won't withhold care). Ideal pilot design.
4. **Matched / synthetic control** against similar patients (practice or claims data), then
   eventually **RCT** — a payer-funded, later-stage milestone, not an MVP task.

**Handle the named confounders explicitly:** capture meds at intake and stratify/exclude
patients with mid-cycle med changes; require a stable baseline for regression-to-the-mean.

**Positioning ladder — never overclaim:** *"promising dose-response signal within our
cohort"* → *"stepped-wedge pilot"* → *"matched-control study"* → *"payer-funded RCT."*
Say "proven" only from rung 3 onward.

### #3 — Self-report noise for the payer dataset

**Key insight: the outcome is objective; only the mechanism is self-reported.**

- **The lab is ground truth.** Payers buy outcomes (lab improvement) — a biomarker, not
  self-report. Logs only explain the *mechanism*; they are not the *outcome claim*.
- **Three-signal triangulation:** purchase (receipt, verifiable) + consumption (log) +
  biomarker (lab). Agreement is strong evidence; divergence is flagged, never fabricated.
- **Confidence-weighting** (already designed): sell payers the high-confidence subset
  (photo-verified > nudge-confirmed > inferred-from-receipt).
- **Future-proof for the diabetes vertical:** **CGM (continuous glucose monitoring)** gives an
  objective, near-real-time biomarker for T2D — pairing logs with CGM replaces self-report
  with a passive signal, exactly in the vertical being targeted.

### #7 — Pricing / buyer: plug into reimbursement that already exists

**Don't invent a payment path — connect to existing rails.**

- **MNT (Medical Nutrition Therapy)** — CPT **97802 / 97803**, covered by Medicare for
  **diabetes and CKD** (dietitian-delivered). The beachhead condition is already a reimbursed
  category. *(⚠️ Fact-flag: CPT codes, coverage, and rates change annually — verify current-
  year specifics with CMS / a billing specialist before quoting them in a pitch.)*
- **RTM (Remote Therapeutic Monitoring)** — CPT **98975–98978**, created to bill remote
  monitoring of therapy adherence/response for non-physiologic data. Smart Savor's weekly
  logging loop is almost purpose-built to make RTM billable. *(⚠️ Fact-flag: same — RTM codes
  and rules are recent and evolving; confirm current CMS guidance.)*
- **Pricing story:** land free with private-practice dietitians (no procurement — the
  beachhead) → charge **per-patient-per-month** to chronic-care *programs* (they have budgets
  and measure outcomes) → the tool **pays for itself by unlocking MNT + RTM billing** the
  dietitian couldn't previously capture. A "we make you money" pitch, not "we cost you money."

### #8 — Moat timing: honest cold-start, specific compounding

- **Day one: thin — say so.** Near-term defensibility is a **capability moat**:
  receipt→habit ingestion done well (fuzzy USDA matching, the price×nutrient join) is
  genuinely hard and not an incumbent priority.
- **The durable moat is the condition-specific outcome dataset**, and it **compounds**: each
  cycle sharpens "which swap actually closed which gap for this condition" → better
  recommendations → better outcomes → more data. **Vertical focus accelerates it.**
- **Switching cost:** once a practice runs its panel through you, the longitudinal
  adherence+outcome record lives in your system; leaving means losing patient history.
- **vs. incumbents adding receipts:** they own the workflow but "can't retroactively
  manufacture the outcome data" — depth-in-one-condition widens that gap faster than they can
  follow across all conditions.
- **Time-to-moat metric:** ≈ *N patients × completed cycles in the vertical* — make it an
  internal defensibility north-star.

## Open build items surfaced by this script

1. **Macro/mineral dashboard (screen 6)** — the only net-new UI concept; not in current specs.
   Decide whether "targets trending into range" is a patient-facing view or stays on Maria's side.
2. **Agents 1, 2, 3, 4** — prompt-only today; screens 2, 4, 5, and Act 3 need them wired to
   the MCP. Agent 4 (swap sourcing) is the priority — it powers the USP moment.
3. **Weekly feedback loop (Act 2.5)** — net-new: photo/voice/text log capture, a nudge engine,
   `weekly_cron` cadence, and a consumption-confidence model (photo > nudge-confirmed >
   inferred-from-receipt). Nudge trigger is a set difference: **items on receipts − items
   logged = the bought-but-not-logged set** to confirm (further narrowed to gap-relevant
   foods). Needs a store field to record confirmed vs. inferred consumption per item.
