# Capstone Spec — Smart Savor *(working name, rename freely)*

**A practitioner tool that turns a patient's flagged nutrient gap into affordable, minimally-disruptive food swaps — and lets the dietitian validate whether the gap is actually closing.**

**Who it's for.** A **dietitian or nutritionist** managing patients who has no good way to check whether a prescribed diet is working in real life. Today they set targets and hope; Smart Savor gives them a per-patient snapshot — *prescribed targets vs. what the patient is actually buying vs. whether the gap is closing* — plus agent-generated swap suggestions the practitioner can **approve or adjust**. The patient is the end beneficiary; the dietitian is the user and stays in control. (Example: patient flagged low vitamin C, eating a banana daily → agent proposes citrus, cheaper per mg of vitamin C and in-budget → dietitian approves.)

> **Framing note (deliberate, and now stronger):** A **licensed practitioner sets the targets; the agent operationalizes them.** Clinical authority sits with the human, so Smart Savor is a workflow tool, not a diagnostic one — the agent translates an already-flagged gap into food suggestions the practitioner signs off on. Health data is handled with security-conscious design (encryption + Clerk-gated access); no HIPAA-compliance claim is made.

---

### Bar 1 — Configurable goal (target · sources · success criteria)
**Target.** The **dietitian** states, per patient, the nutrient gaps to close (from the patient's lab report) plus constraints: dietary restrictions, dislikes, weekly budget. The agent works toward closing each gap with in-budget, low-disruption swaps the practitioner can approve.
**Success criteria (measurable for Demo Day):**
- For each flagged nutrient, the agent surfaces **≥3 candidate foods** that meaningfully close the gap, ranked by **cost per unit of the target nutrient**.
- Every recommended weekly plan stays **within the stated budget**.
- Swaps prefer foods **near the patient's existing buying habits** (minimal-disruption score).
- Reported metrics: % of flagged gaps with a valid in-budget swap; projected cost delta vs. current diet; practitioner approve/adjust rate.

### Bar 2 — Background planning that re-plans
Not answer-on-demand. The agent regenerates the corrective plan **every Sunday** and **re-plans on changed inputs**:
- **New health report uploaded → targets shift** *(headline trigger)*
- New receipt / intake logged
- Budget edited mid-week
- Item marked disliked or unavailable
- Price-snapshot refreshed

### Bar 3 — Sources (≥3 types, ≥1 custom MCP)
1. **USDA FoodData Central** — *off-the-shelf MCP.* Per-food micronutrients (vitamins, minerals), not just macros.
2. **Open Food Facts / recipe HTTP-fetch** — *off-the-shelf MCP.* Branded/packaged item lookup and recipe ingredient lists.
3. **Health & Pantry Profile** — **custom MCP authored in Claude Code.** Stores the user's flagged nutrient gaps, dietary constraints, dislikes, budget, and logged intake — **and serves the stitched price × nutrient reference table** (see Dataset below).

### Bar 4 — Multi-modal outputs (≥2 beyond plain text)
- **Practitioner per-patient dashboard UI** *(headline output)* — prescribed targets vs. actual buying behavior, gap-closing trend over time, and an **approve / adjust** gesture on each suggested swap so the dietitian stays in control.
- **PDF** weekly *Nutrient Correction Plan* + deduped shopping list the practitioner can hand to the patient (WeasyPrint).
- *(Optional 3rd lane)* **Email** digest to practitioner or patient on plan changes / new report (Resend).

### Bar 5 — Named Skills (each: prompt + ≥3 eval cases)
**Skill A — Food Matcher (Nutrient–Price Linker).** *The headline join.* Given a Walmart product name + category, resolve it to the correct FDC food entry so nutrients attach to price. Fuzzy/semantic match — exact strings won't work (*"Fresh Green Bell Pepper, Each"* ≠ *"Peppers, sweet, green, raw"*).
- *Evals:* bell pepper → correct FDC id; roma tomato → correct id; broccoli crowns → correct id; + one ambiguous negative.
- **Invoked from BOTH Claude Code (dev — building the offline join) AND the headless Agent SDK runner (prod — matching new items).** ✅ satisfies the dual-invocation requirement.

**Skill B — Nutrient Gap Resolver (Cost-Efficient Sourcer).** Given a flagged gap + current diet + constraints + budget, return ranked swaps that close the gap, scored by cost-per-unit-nutrient and disruption.
- *Evals:* low vitamin C + daily banana → citrus swap; low iron + vegetarian → lentils/spinach swap; budget-capped case where the cheapest valid option must be chosen.

### Bars 6–7 — Program infra (acknowledged)
Deploy at `<student>.apps.human-angle.com`, HTTPS + Clerk + cost cap (W5/W8); Langfuse traces + spend ceiling (W7).

---

### MVP demo cut — what a dietitian sees *(same build, staged story)*
The deployed app wears two hats from **one codebase**: a **capstone cut** (Kamal sees the bars — custom MCP, eval-backed Skills, traces) and a **pitch cut** for real practitioners. The pitch cut is staging, not new engineering:
- **One or two seeded patients with a real-feeling story** — e.g. low iron + low vitamin C, repetitive cheap diet, tight budget.
- **The "aha" screen front and center** — *this patient keeps buying X; for the same money, Y closes the iron gap* → dietitian clicks **approve**.
- **Practitioner snapshot as the landing view** — prescribed vs. actual vs. gap-closing trend.
- **Scope guard:** one or two seeded patients, **not** a real multi-tenant SaaS. It *looks* like it could scale to a caseload; it doesn't have to *be* that for Demo Day. Real auth, patient onboarding, and data isolation are explicitly out of scope.

---
### Dataset — how the reference table is built *(honest-sources note)*
A **joined reference dataset derived from two real sources**, not a fabricated one:
- **Real prices:** Walmart grocery snapshot (Kaggle, Sept-2022) — SKU, name, brand, `PRICE_CURRENT`, category.
- **Real nutrients:** USDA FoodData Central.
- **Data-science work:** the **Food Matcher** Skill links the two offline; unit/size is **normalized** out of `PRODUCT_NAME` where the size column is blank; **synthetic imputation is used only for genuinely missing fields** (e.g. estimated pack size). Prices and nutrients themselves are real.
- Scope for Demo Day: pre-filter to nutrient-relevant departments (Produce, Dairy, Meat/Seafood, Frozen) and **pre-compute the join once** so runtime stays fast and the demo stays reliable.

**Why this is a reshape of the Cooking Plan template, not a new domain:** same engineering shape, but driven by *diagnosed nutrient gaps* rather than a generic macro target — which makes the relevance filter and the join Skill more distinctive than the template's defaults.
