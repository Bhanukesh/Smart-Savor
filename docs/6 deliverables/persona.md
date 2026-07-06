# Smart Savor — Personas & Jobs-to-be-Done

*Working name · updated 2026-07-05 (reconciled with `smart-savor-demo-script.md`)*

---

## Beachhead: one condition, on purpose

Smart Savor launches **narrow** — **Type 2 diabetic patients with elevated cardiovascular
risk** (creeping BP and cholesterol), managed by a private-practice dietitian. This vertical
is a deliberate choice, not a limitation:

- **Clinically urgent.** Type 2 diabetics are **2–4× more likely to develop or die from heart
  disease.** Clean diet — right macros, healthy fats, key vitamins & minerals in range — is
  first-line control for the BP and cholesterol driving that risk. High stakes make the value obvious.
- **It makes the product tractable.** One condition means the dietitian-approved swap lists are
  largely a reusable **condition × gap template** the agent drafts and the dietitian ratifies —
  instead of authoring from scratch per patient.
- **It deepens the moat faster.** Depth in one condition compounds the outcome dataset quicker
  than spreading thin across many.
- **It plugs into existing reimbursement.** Diabetes (and CKD) are already covered categories
  for dietitian-delivered Medical Nutrition Therapy. *(Verify current-year CPT/coverage.)*

Expansion (CKD, hypertension, GLP-1 follow-up) comes *after* the loop is proven here.

---

## Primary Persona (the BUYER) — "Maria," the Private-Practice Dietitian

**Who she is**
- Registered Dietitian, small private practice (or inside a chronic-care program). Caseload of
  30–80 patients, many Type 2 diabetic with cardiac risk, plus hypertension, CKD, GLP-1 follow-up.
- Cash-pay or program-funded. Time-poor; 30–45 min slots, weeks apart.
- Comfortable with charting tools (Healthie/Nutrium) but frustrated they show *plans*, not *behavior*.

**Her reality today**
- She knows the right advice and gives it. Patients nod, leave, and **don't follow it**. She finds
  out only at the next visit — if they show up.
- She has no objective read on what the patient actually buys or eats, and no way to demonstrate
  her work moved the numbers.

**The job she's hiring Smart Savor to do**
> *"When a chronic patient leaves my office, help me **see whether they're actually following the
> plan** and **prove the diet is working** — so I spend less time guessing and can show real results."*

**Sub-jobs**
1. *Turn a flagged gap into swaps the patient will realistically eat* — without building plans from
   scratch. (She **ratifies** an agent-drafted, condition-specific approved list; she doesn't author it.)
2. *Stay in clinical control* — approve or adjust every recommendation; nothing clinical reaches the
   patient without her sign-off. This is what keeps it "agent-assisted clinician," not "algorithm prescribing."
3. *See behavior between visits* — via the purchase-vs-consumption reconciliation (receipts + logs),
   not just a snapshot at the next appointment.
4. *Prove outcomes* with lab improvement she can show patients, programs, and eventually payers.

**What makes her adopt**
- It surfaces the "aha" instantly: *this patient keeps buying X; here's a menu of gap-closing swaps
  he'll actually eat — I just approve it.*
- It plugs into how patients already shop (receipts), not another logging chore she has to police.
- It can help her **bill for monitoring** she couldn't capture before (MNT + remote monitoring).
- Free to start; proves itself on her own patients.

**What makes her churn**
- Fabricated or noisy data she can't trust. Recommendations that are clinically wrong for the patient.
- The tool *adding* work instead of saving it (if she had to author every list, or wade through
  daily logs across her whole panel).

---

## Secondary Persona (the BENEFICIARY, and the emotional heart of the demo) — "Sam," the Type 2 Patient

*The dietitian buys; Sam is who the product has to delight. The demo spends most of its screen time here.*

**Who he is**
- 54, Type 2 diabetic with creeping blood pressure and cholesterol — so, elevated cardiac risk he's
  been told about but doesn't *feel*. Busy, cost-sensitive, not a quantified-self type. Tried a
  logging app once and quit within a week.
- Lives with family (so the grocery cart isn't only his). Shops mostly at one or two stores.

**How he feels about "eating for his condition" today**
- The diet feels like a **list of foods he can't have** — a prescription to endure, handed down and
  joyless. So he drifts. He's not lazy; the plan just never fit his life or his tastes.
- Vaguely anxious about his heart, but the risk is abstract and the daily effort is concrete —
  so the effort loses.

**The job he's hiring Smart Savor to do**
> *"Help me eat better for my condition **without changing my whole life or budget** — tell me the
> small swaps that matter, let me **eat what I actually like**, and don't make me log every bite."*

**Sub-jobs**
1. *Get credit for what I already do* — upload my last few months of receipts instead of starting
   from zero.
2. **Choose what I eat, within what's safe for me.** My dietitian says what my body needs; *I* pick
   the food that delivers it from a menu she's already approved. The app tells me how much. → **This
   is the USP Sam feels:** the diet stops being a prescription and becomes a menu he picks from.
3. *Log easily, only when I want* — photo or voice, not forms.
4. *Be nudged, not nagged* — a gentle weekly check ("did you get to have the spinach? it's your
   fastest way to close that gap"), never a daily notification firehose.
5. *See myself making progress* — a simple dashboard of his targets trending toward "in range" as he
   eats the swaps (honest: intake toward target, not a between-labs blood level).
6. *(Future — out of scope v1)* **Just have the food show up.** Auto-order his week of dietitian-approved
   fresh produce (fruits & vegetables) to his door, one week at a time — so eating right takes zero
   extra effort. This is the feature that would most delight Sam; it's a Phase 3 expansion, not v1.

**What he needs to feel**
- That the effort is minimal and the plan respects his budget and his tastes.
- That his dietitian — someone he trusts — is behind every recommendation.
- That he's **choosing**, not being dictated to — the source of adherence.

**What makes him disengage (his churn = Maria's failure)**
- Daily-logging dependence. Nudges that feel like nagging or surveillance. A menu full of foods he
  dislikes or can't afford. A progress screen that feels fake.

---

## Anti-Persona — Who this is NOT for (v1)
- **The self-directed consumer** with no clinician. No accountability loop, no clinical sign-off on
  the swap menu, no labs → adherence collapses, no payer. (Sam without Maria is not the product.)
- **The acute/hospital clinical setting** requiring certified diagnostic tooling. Smart Savor is a
  workflow tool; clinical authority stays with the practitioner.
- **Conditions outside the beachhead (v1).** CKD, hypertension, GLP-1 follow-up are expansion, not
  launch — the approved-list templates and outcome data are built condition-by-condition.

---
*Companion docs: demo script (`smart-savor-demo-script.md`, current source of truth), one-pager
(`smart-savor-one-pager.md`), PRD & epic backlog (`smart-savor-prd-epics.md`).*
