# Smart Savor — UI Spec (Screens, Layouts, States)

*2026-06-27 · Scope: full Dietitian view + light Patient view. Hand-off doc for Figma / HTML prototyping.*

> **Clickable prototype:** self-contained HTML/CSS mockups of the hero screens live in
> `smart-savor-prototype/` — open `index.html` in a browser. Covers D1.5 (prioritize), D2/D3 (ratify),
> P2 (the USP choose→recompute, interactive), P4 (dashboard), and P5 (Fresh Box, future). Screenshot-ready for the deck.

---

## 0. Principles
- **Dietitian view is the hero.** It carries the demo. Patient view is a believable supporting cast.
- **The command center is a 3-month cycle manager, not a dashboard** (see §0.1).
- **The "aha" must land in one glance:** *keeps buying X → for the same money, Y closes the gap.*
- **Clinician stays in control:** every AI suggestion is a *draft the dietitian ratifies*. The agent auto-selects the focus set and proposes swaps, but **always shows its reasons** and requires an **explicit confirm with one-tap override** — never a silent clinical decision.
- **Actuals, not forecasts.** Show what the patient has actually bought; use the *adherence proxy* (are they buying the approved swaps?) as the mid-cycle signal. No projected-outcome guessing.
- **Be honest about data:** show "last updated from receipts" dates; don't fake real-time.
- **Two personas, two apps, one brand:** shared logo/colors, different navigation and density.

## 0.1 Core model — the 3-month cycle
Everything orbits a **3-month focus cycle** per patient:
1. **New lab** surfaces all deficiencies (often 15–20).
2. **Prioritize:** the agent auto-selects a **focus set of 6–10** deficiencies for this cycle (capacity ceiling — behavior change can't absorb more), ranked by **severity · condition-relevance · synergies/conflicts · cost-to-close · disruption**, and **flags pairs and conflicts** (e.g. *Vitamin C boosts iron → pair them; Calcium blocks iron → defer*). The dietitian **confirms or overrides**.
3. **Track:** weeks 1–12, watch actuals-from-receipts + whether the patient is buying the approved swaps.
4. **Re-test:** at month 3 the lab is the ground truth. **Success is measured here.** Closed gaps graduate; unclosed gaps + parked deficiencies feed the next cycle.

So the dietitian's screens map to cycle stages: **Caseload** (which cycles need attention) → **Prioritize** (start a cycle) → **Track** (run a cycle) → **Outcome** (close a cycle).

---

## 1. Screen Inventory

### Dietitian view (full)
| # | Screen | Purpose | Priority |
|---|--------|---------|----------|
| D1 | Caseload / Patient List | Landing; triage which cycles need attention | P0 |
| D1.5 | Cycle Prioritization | Agent auto-selects 6–10 focus deficiencies; dietitian confirms/overrides | P0 |
| D2 | Cycle Tracking (Patient Dashboard) | THE "aha"; prescribed vs actual + adherence + swap cards, within the cycle | P0 |
| D3 | Swap Review (modal/panel) | Approve/adjust a single suggestion with full detail | P0 |
| D4 | Cycle Outcome (Lab) | Baseline vs 3-month re-test; what closed; feed next cycle | P0 |
| D5 | Patient Setup / Constraints | Conditions, budget, dislikes, restrictions (gaps come from lab) | P1 |
| D6 | Plan / PDF preview | Weekly correction plan + shopping list to hand off | P1 |

### Patient view (light)
| # | Screen | Purpose | Priority |
|---|--------|---------|----------|
| P1 | Upload Receipts (onboarding) | Drag/drop last few months of receipts | P0 |
| P2 | My Plan | Approved swaps to try + shopping list | P0 |
| P3 | Quick Log | Optional photo/voice food log | P1 |
| P4 | My Progress | Simple "on track?" view | P1 |
| P5 | Fresh Box (Weekly Produce Fulfillment) | Review + one-tap order the week's approved fresh produce (fruits & veg) to the door | **Future — out of scope v1** |

---

## 2. Dietitian View — Screen Details

### D1 — Caseload / Patient List (landing)
**Job:** triage at a glance — which *cycles* need me today.
**Layout:** top bar (logo · "Maria, RD" · search) → filter chips (All · Needs review · Lab due · New cycle · Gap widening) → patient rows.
**Each row:** name · conditions · **cycle position** ("Wk 4/12" · "Lab due 6d" · "New cycle") · focus-set progress (e.g. 3/7 gaps improving) · status chip · last receipt date.
**Status chips:** 🟢 On track · 🟡 Needs review · 🔴 Gap widening · 🔵 Lab due · 🟣 New cycle (needs prioritization).

```
┌ Smart Savor ─────────────────────────── Maria, RD  🔍 ─┐
│ [All] [Needs review] [Lab due] [New cycle] [Widening]    │
│ ──────────────────────────────────────────────────────  │
│ Sam Rivera    Diabetes      Wk4/12  3/7 ↑  🟡  rcpt 3d › │
│ Ana Lee       Hypertension  Wk9/12  5/6 ↑  🟢  rcpt 1d › │
│ Joe Park      CKD           Lab due 🔵      rcpt 9d › │
│ Mia Wong      Pre-diabetes  New cycle 🟣 needs setup  › │
└──────────────────────────────────────────────────────────┘
```
**States:** empty (no patients yet → "Add your first patient"), loading, error.

---

### D1.5 — Cycle Prioritization  ⭐ THE "SMART" SCREEN
**Job:** turn a 15–20-item lab into a focused 6–10-deficiency plan for this cycle — agent drafts, dietitian ratifies.
**Layout:** two columns. **Left = all deficiencies** (from latest lab) with severity, condition-relevance, and an agent flag (pair / conflict / cheap win). **Right = focus set** the agent auto-selected (6–10), with a capacity meter and per-item *reason*. Cycle dates header (start → re-test).
**Agent behavior:** auto-selects the focus set ranked by **severity · condition-relevance · synergy/conflict · cost-to-close · disruption**; pulls synergistic gaps *in* (Vit C with iron), defers conflicting ones *out* (Calcium vs iron). Each pick shows a one-line **why**.
**Dietitian control:** every item has a toggle to add/remove; **capacity guardrail** warns above 10; a single **"Confirm focus set"** ratifies. Nothing proceeds until confirmed — the agent's selection is a *draft*.

```
┌ Sam Rivera · Diabetes · NEW CYCLE   start Apr 2 → re-test Jul 2 ┐
│ ALL DEFICIENCIES (Apr 2 lab)        FOCUS THIS CYCLE  7/10 ▓▓▓░ │
│ ─────────────────────────────      ──────────────────────────  │
│ Iron       ▼▼▼ sev · diabetes  →  ● Iron        why: severe     │
│ Vitamin C  ▼▼  mod · pairs iron→  ● Vitamin C   why: ↑ iron abs │
│ Magnesium  ▼▼  mod · diabetes  →  ● Magnesium   why: condition  │
│ Fiber      ▼▼  mod · diabetes  →  ● Fiber       why: cheap win  │
│ B12        ▼▼  mod            →  ● B12         why: severity   │
│ Folate     ▼   mild · pairs B12→  ● Folate      why: pairs B12  │
│ Potassium  ▼   mild · diabetes →  ● Potassium   why: condition  │
│ Vitamin D  ▼   mild           →  ○ later                        │
│ Zinc       ▼   mild           →  ○ later                        │
│ Calcium    ▼   mild · ⚠blocks Fe→ ○ deferred (conflict w/ iron) │
│                                   [ Confirm focus set (7) ]      │
└──────────────────────────────────────────────────────────────────┘
```
**States:** agent-still-ranking (loading), >10 selected (capacity warning), dietitian overrode agent (show "edited" badge), no new lab (can't start cycle).

---

### D2 — Cycle Tracking (Patient Dashboard)  ⭐ THE "AHA" SCREEN
**Job:** for the active cycle — what I prescribed, what they're actually buying, whether they're following the plan, and what to do next. **Actuals only; no forecast.**
**Layout (top → bottom):**
1. **Header:** ‹ back · patient name · conditions · status chip · "Last updated from receipts: 3d ago".
2. **Cycle timeline:** start → today (Week X/12) → re-test date. The single anchor that orients everything.
3. **Focus-set table** (the 6–10 confirmed gaps only): Prescribed · Actual (from receipts) · Trend · direction arrow · **swap status** (suggested / approved / being-bought).
4. **Adherence strip:** "Buying 4 of 6 approved swaps" — the honest mid-cycle signal (replaces a forecast).
5. **Swap suggestion cards** (per open gap): the side-by-side with Approve/Adjust.

```
┌ ‹ Caseload   Sam Rivera · Diabetes · 🟡                 ┐
│ Cycle: ●─────●──────────○   Wk 4/12   re-test Jul 2     │
│ Last updated from receipts: 3 days ago                  │
│ Adherence: buying 4 of 6 approved swaps                 │
│                                                         │
│ FOCUS GAP     PRESCRIBED  ACTUAL  TREND  SWAP            │
│ Iron          18 mg/day   9 mg    ╱╲╱↑   ✓ being bought  │
│ Vitamin C     90 mg/day   40 mg   ╲╱╲↓   ✓ approved      │
│ Magnesium     420 mg/day  300 mg  ╱╱ ↑   suggested       │
│ ──────────────────────────────────────────────────────  │
│ ⚡ MAGNESIUM — swap suggestion                            │
│ ┌───────────────┬───────────────┐                       │
│ │ Keeps buying  │ Swap to       │                       │
│ │ White rice    │ Brown rice    │                       │
│ │ $0.05 / mg Mg │ $0.02 / mg Mg │                       │
│ └───────────────┴───────────────┘                       │
│ Same ~$3.80/wk · closes ~50% of magnesium gap            │
│              [ Adjust ]   [ ✓ Approve ]                  │
└──────────────────────────────────────────────────────────┘
```
**States:**
- *Insufficient receipt data* → gap row shows "not enough data" instead of a fake actual.
- *No valid in-budget swap* → card shows "No in-budget swap closes this gap — adjust budget or target."
- *Approved* → card collapses to "Approved ✓ — added to plan"; gap's swap status → "approved," then "being bought" once it appears on receipts.
- *Adherence dropping* → strip turns amber ("not buying 2 approved swaps") — the cue to intervene before re-test.

---

### D3 — Swap Review (modal / side panel)
**Job:** the full justification before the dietitian commits.
**Contents:** current item vs candidate(s); cost-per-nutrient; weekly budget impact (before/after bar); disruption score ("close to current habits"); dietary-constraint check (✓ vegetarian, ✓ no dairy); alternative candidates (≥3, ranked).
**Actions:** Approve · Adjust (swap to a different candidate / edit quantity) · Reject with reason.

```
┌ Swap review — Iron ───────────────────── ✕ ┐
│ Current: White rice    9 mg/wk   $0.04/mg   │
│ Candidates (ranked by $/mg Fe):             │
│  ● Lentils      $0.01/mg  ✓veg ✓budget      │
│  ○ Spinach      $0.02/mg  ✓veg ✓budget      │
│  ○ Tofu         $0.03/mg  ✓veg ✓budget      │
│ Budget: $40/wk → $39.10/wk  ▓▓▓▓▓░  ok       │
│ Disruption: Low (already buys grains/beans)  │
│        [ Reject ]  [ Adjust ]  [ Approve ]   │
└──────────────────────────────────────────────┘
```

---

### D4 — Cycle Outcome (Lab)
**Job:** prove it worked and **close the cycle.** Baseline vs 3-month re-test across the focus set, with the headline improvement — *this is where success is measured.*
**Layout:** big number ("5 of 7 focus gaps improved"), per-nutrient before→after bars, adherence context (did they buy the approved swaps?). **Cycle hand-off panel:** closed gaps "graduate"; unclosed focus gaps + previously parked deficiencies are pre-loaded as candidates for the **next cycle's prioritization (D1.5)**.
**States:** re-test not yet due (countdown to Jul 2), re-test overdue (prompt to schedule), no baseline (prompt to enter), partial labs (only some nutrients re-tested).

---

### D5 — Patient Setup (P1)
**Job:** dietitian enters flagged gaps (from lab) + constraints.
**Fields:** nutrient gaps (add rows: nutrient · target), dietary restrictions, dislikes, weekly budget, conditions. **This is dietitian-entered — the AI never sets targets.**

### D6 — Plan / PDF preview (P1)
**Job:** the handoff artifact. Weekly correction plan + deduped shopping list, "Download PDF."

---

## 3. Patient View — Screen Details (light)

### P1 — Upload Receipts (onboarding)  ⭐ shows where data comes from
**Job:** make it trivial to give months of history.
**Layout:** friendly headline ("Add your last few months of grocery receipts"), big drag/drop zone, list of uploaded receipts with parse status (✓ read · ⏳ reading · ⚠ couldn't read), "Done."
```
┌ Smart Savor ─────────────── Hi, Sam ┐
│ Add your grocery receipts             │
│ ┌─────────────────────────────────┐  │
│ │   ⬆  Drag receipts here          │  │
│ │      or tap to upload            │  │
│ └─────────────────────────────────┘  │
│ costco_apr.jpg     ✓ read            │
│ walmart_mar.pdf    ✓ read            │
│ blurry_feb.jpg     ⚠ couldn't read   │
│                         [ Done ]      │
└───────────────────────────────────────┘
```

### P2 — My Plan
**Job:** what to actually buy/eat. The dietitian-approved swaps + shopping list. Friendly, not clinical: "Try lentils instead of white rice — same cost, more iron."

### P3 — Quick Log (P1)
**Job:** optional photo/voice log between receipts. Camera button + mic button. Low friction, no forms.

### P4 — My Progress (P1)
**Job:** simple encouragement. "You're on track for iron 🎉 / Next lab: Jul 2." No dense charts.

---

## 4. Shared Components
- **Status chip** (on track / needs review / gap widening / lab due)
- **Gap row** (nutrient · prescribed · actual · trend sparkline · arrow)
- **Swap card** (keeps-buying vs swap-to, cost-per-nutrient, budget delta, Approve/Adjust)
- **Budget bar** (before/after weekly spend)
- **Trend sparkline**
- **"Last updated from receipts" timestamp** (honesty about cadence)
- **Empty / insufficient-data / no-valid-swap states** (reused everywhere)

## 5. Visual Tone
- Clean, clinical-but-warm. Trust-forward (this is health data).
- Color = meaning: green good, amber attention, red regressing, blue scheduled.
- Money and nutrients are first-class: dollars and mg always visible together — that's the product's whole identity.

---

## 6. Demo Flow (what to click on Demo Day)
1. Open **D1 Caseload** → Mia is 🟣 "New cycle," Sam is mid-cycle 🟡.
2. Click Mia → **D1.5 Prioritization** → agent has auto-picked 7 of 18 deficiencies, *pulling Vit C in with iron and deferring Calcium (conflict)*. Show the reasons → click **Confirm focus set**. *(This is the "smart" beat.)*
3. Open **D2 Cycle Tracking** for Sam → cycle timeline (Wk 4/12), focus gaps, adherence "buying 4 of 6 swaps."
4. The **swap card** delivers the "aha": white rice → lentils, same money, closes the gap → click **Approve** → turns green.
5. Jump to **D4 Cycle Outcome** on a completed patient → "5 of 7 focus gaps improved" at re-test, closed gaps graduate, leftovers feed the next cycle.
6. (Optional) flip to **P1/P2 patient side** to show where the receipt data comes from.

---
*Next: prototype these in Figma (via Figma MCP) or as a clickable HTML/React mockup. The hero path to build first is D1 → D2 → D3.*
