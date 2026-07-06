# Capstone Spec — Smart Savor *(working name, rename freely)*

*updated 2026-07-05 · reconciled with the 6 deliverables (product-brief-one-pager, agents, persona, prd-epics, hypothesis, prototype).*

**A practitioner tool that turns a patient's flagged nutrient gap into a menu of gap-closing, minimally-disruptive foods the patient *chooses from* — the dietitian ratifies the menu, the agent computes the amount, and the dietitian validates whether the gap is actually closing.**

**Who it's for.** The beachhead: **private-practice dietitians serving Type 2 diabetics with elevated cardiovascular risk** — a deliberately narrow vertical (Type 2 diabetics are 2–4× more likely to develop/die from heart disease; clean diet is first-line control). The **dietitian (Maria, RD)** is the buyer and clinical authority; the **patient (Sam, 54, Type 2)** is the beneficiary and a light data-entry surface. Today the dietitian sets targets and hopes; Smart Savor gives a per-patient snapshot — *prescribed targets vs. what the patient actually buys/eats vs. whether the gap is closing* — plus agent-drafted swap menus she **ratifies**.

> **The USP — choice within clinical bounds.** *The doctor prescribes what the body needs; the patient chooses the food that delivers it.* The dietitian fixes the nutrient target (**X**); the patient freely picks the source from a ratified menu; the agent computes how much (**Y = target ÷ nutrient-per-serving**). Same target, a food he'll actually eat — a menu he picks from, not a prescription he endures. *(Example: Sam is low on iron + vitamin C and buys a banana daily → the agent surfaces citrus / iron-rich options near his habits → he picks oranges + lentils → the agent computes the serving → Maria approves → the 3-month lab confirms.)*

> **Framing note (deliberate).** A **licensed practitioner sets the targets; agents operationalize them.** Agents **draft**, the dietitian **ratifies** — clinical authority stays human, so Smart Savor is a workflow tool, not a diagnostic one. Comorbidity safety is **hybrid and human-owned**: hard rules auto-exclude, AI flags uncertain interactions, the dietitian has the last word. **Receipts prove purchase; logs prove consumption** — Smart Savor reconciles the two and nudges only on the bought-but-not-logged gap. Health data is handled with security-conscious design (encryption + Clerk-gated access); no HIPAA-compliance claim is made.

### Runtime agents (Claude Agent SDK runner) — lifecycle order
Two shared **Skills** (A Food Matcher, B Gap Resolver) are tools, not agents. Agent 3 uses pure clinical judgment (no Skill).

| # | Agent | Job | Model | Key tools |
|---|---|---|---|---|
| 1 | **Patient Intake Ingestion** *(built — `intake_agent.py`)* | intake doc → structured profile (demographics, measured vitamin/mineral levels, history, constraints); never sets clinical gaps | Haiku 4.5 → Opus on ambiguity | Anthropic SDK / `claude` CLI, Health & Pantry MCP |
| 2 | **Ingestion: Receipts + Logs** *(wraps Skill A)* | receipts → purchase model; photo/voice/text logs → consumption events | Haiku 4.5 → Sonnet | vision/transcription, Health & Pantry MCP, Skill A |
| 3 | **Cycle Prioritization** ⭐ | full lab deficiency list → confirmed **6–10 focus set** (severity × condition-relevance × synergy/conflict × disruption); dietitian confirms (D1.5) | Opus 4.8 | Health & Pantry MCP, USDA MCP |
| 4 | **Swap Sourcing & Approved-List Drafting** ⭐ *(wraps Skill B, THE USP engine)* | `draft_list`: comorbidity-screened menu ranked by gap-closing efficiency then disruption; `patient_choice`: recompute amount Y | Sonnet 4.6 | Health & Pantry MCP, Open Food Facts MCP, Skill B |
| 5 | **Nudge / Adherence** | one gentle **weekly (never daily)** nudge on bought-but-not-logged gap foods | Haiku 4.5 | Health & Pantry MCP, Resend |
| 6 | **Re-planning Orchestrator** | background: decides what changed, re-runs only affected agents, summarizes | Sonnet 4.6 | scheduler (Celery/cron), the other agents |

*Post-MVP (documented, not built): Cycle Outcome Analyst (computes the dose-response), Agent 7 Fulfillment/Cart-Builder (Phase 3 fresh-produce, out of scope).*

---

### Bar 1 — Configurable goal (target · sources · success criteria)
**Target.** The **dietitian** states, per patient, the nutrient gaps to close (from the lab) plus constraints: dietary restrictions, dislikes, and (optionally) weekly budget. Agent 3 caps the cycle at a **6–10 gap focus set**; Agent 4 drafts a comorbidity-screened menu of gap-closing foods the dietitian **ratifies** before the patient sees it.
**Ranking:** **gap-closing efficiency first, then minimal disruption** (foods near the patient's existing habits). **Affordability is an OPTIONAL signal, NOT enforced in v1** — price stays in the data model, reserved for a future B2C launch; it is never the primary ranking key and no budget is enforced.
**Success criteria (measurable for Demo Day):**
- For each flagged nutrient, the ratified menu offers **≥3 candidate foods** that meaningfully close the gap.
- **USP behavior:** the patient picks any menu food → the agent **recomputes the amount (Y)** → the plan is stamped "still approved" (target closed + within the dietitian's ratified bounds).
- Explicit **"no viable swap within constraints"** state (never fabricate one).
- Reported metrics: **≥85%** of gaps have a viable gap-closing swap; **≥70%** swap approve/adjust rate; **≥80%** of patients get a usable habit model from receipts.

### Bar 2 — Background planning that re-plans
Not answer-on-demand — driven by **Agent 6 (Orchestrator, Sonnet)** on a headless Agent SDK runner, which re-runs **only the affected agents** (cost discipline) and can fire **Agent 5 (Nudge, Haiku)**. Triggers route to specific agents:
- **New lab uploaded → targets shift** *(headline)* → Agent 3 (new focus-set draft)
- New receipt → Agent 2, then Agent 4 for affected gaps
- New consumption log → Agent 2 + **purchase-vs-consumption reconciliation**
- Budget edited / item disliked or unavailable → Agent 4
- **`weekly_cron` → full refresh + fire the weekly nudge**
- Price-snapshot refreshed → Agent 4

### Bar 3 — Sources (≥3 types, ≥1 custom MCP)
1. **USDA FoodData Central** — *off-the-shelf MCP.* Per-food micronutrients (vitamins, minerals), not just macros.
2. **Open Food Facts / recipe HTTP-fetch** — *off-the-shelf MCP.* Branded/packaged item lookup and recipe ingredient lists.
3. **Health & Pantry Profile** — **custom MCP authored in Claude Code.** Stores flagged gaps, constraints, dislikes, budget, **the dietitian-ratified approved lists, logged consumption events + consumption-confidence, and nudge records** — **and serves the stitched price × nutrient reference table** (see Dataset).

### Bar 4 — Multi-modal outputs (≥2 beyond plain text)
**Inputs are multi-modal too:** receipt images/PDFs and **photo / voice / text food logs** (Claude vision + transcription).
- **Patient USP "choose" screen** *(hero output — `patient-swap.html`)* — tap a gap-closing food → the agent **recomputes the amount** → "gap fully closed · still within your dietitian's approved plan."
- **Patient macro/mineral dashboard** *(`patient-dashboard.html`)* — a gauge per target trending toward the in-range band, with an **honesty guardrail**: shows *confirmed-log intake toward target* (behavior), **not** a blood level, and moves only on logged foods, never purchases.
- **Practitioner per-patient dashboard** — prescribed targets vs. **actual (purchase + reconciled consumption)**, gap-closing trend, and a **ratify / approve / adjust** gesture; caseload landing + the "aha" screen.
- **PDF** weekly *Nutrient Correction Plan* + deduped shopping list (WeasyPrint); *(optional)* **email** digest on plan changes / new lab (Resend). *(P1.)*

### Bar 5 — Named Skills (each: prompt + ≥3 eval cases)
Skills are shared **tools**, not agents.
**Skill A — Food Matcher (Nutrient–Price Linker).** *The headline join.* Resolve a Walmart product name + category to the correct FDC food entry so nutrients attach to price. Fuzzy/semantic — exact strings won't work (*"Fresh Green Bell Pepper, Each"* ≠ *"Peppers, sweet, green, raw"*).
- *Evals:* bell pepper → correct FDC id; roma tomato → correct id; broccoli crowns → correct id; + one ambiguous negative.
- **Dual-invocation ✅:** used by **Agent 2 (prod — matching new items)** AND the **Join-Pipeline Builder dev subagent (build-time — the offline join)**.

**Skill B — Gap Resolver.** Given a flagged gap + current diet + constraints, return ranked swaps that close the gap, scored by **gap-closing efficiency + minimal disruption** (cost optional, never enforced). **Invoked by Agent 4.**
- *Evals:* **USP case — patient chooses a different menu food → correct recomputed amount (Y)** *(headline)*; low vitamin C + daily banana → citrus with correct serving; low iron + vegetarian → lentils/spinach with correct serving; **"no viable swap within constraints"** empty-menu case; *(optional)* cost-sort case when affordability is turned on.

### Bars 6–7 — Program infra
Deploy at `<student>.apps.human-angle.com`, HTTPS + Clerk + cost cap (W5/W8); Langfuse traces + spend ceiling (W7). **Trace tagging convention:** `agent_name`, `patient_id`, `cycle_id`, `trigger`. **Cost control:** Opus Agent 3 runs only on `new_lab`; high-volume Agent 2 defaults to Haiku.

---

### Success metrics & attribution
- **North Star:** **≥70% of patients show measurable lab improvement at 3-month re-test** vs. a defined baseline. *(The baseline/control — "70% vs. what standard-care rate?" — is an open early priority; the metric isn't credible without it.)*
- **Prove causation via dose-response.** The biochemistry (intake → biomarker, "Link B") is settled science — we don't try to prove it. We only prove **Link A: Smart Savor → intake behavior**. Cheapest credible rung = an **internal dose-response** (adherent vs. non-adherent patients improve differently). Evidence ladder: (1) internal dose-response → (2) within-patient pre/post → (3) stepped-wedge → (4) matched/synthetic control → RCT. Say **"proven" only from rung 3**; otherwise "promising signal." Define the denominator up front (all patients on an active plan, not just re-testers) and pre-register the improvement threshold.
- **Riskiest bets:** **H3 — choice drives adherence (the USP)** and **H5 — the app is causally responsible (dose-response)**; if either is false the thesis is hollow.

### Lab outcome loop (the ground truth & the moat)
Capture **baseline + 3-month re-test** labs, link them to the active plan, and record per-gap improvement. The accumulating **condition-specific outcome dataset** — which swaps, for which gaps, produced real lab movement — is the durable moat incumbents (Healthie, Nutrium, Cronometer) can't retroactively manufacture. Chronic cycles repeat (managed, not cured).

### MVP demo cut — what a dietitian sees *(same build, staged story)*
One codebase wearing two hats: a **capstone cut** (grader sees the bars — custom MCP, eval-backed Skills, traces) and a **pitch cut** for real practitioners (staging, not new engineering).
- **Seeded patient — Sam Rivera**, Type 2 + cardiac risk, iron / magnesium / fiber (+ vitamin C) gaps, repetitive diet, **family household** (so purchases ≠ his personal consumption — motivating the logs + reconciliation).
- **The "aha" — the USP choose-moment front and center:** *Sam picks the food he'll actually eat → the agent recomputes the amount → it stays within Maria's approved plan.* (Not the old "for the same money" framing.)
- **Practitioner snapshot as the landing view** — prescribed vs. actual vs. gap-closing trend.
- **Scope guard:** 1–2 seeded patients, **not** a real multi-tenant SaaS. Real auth/onboarding, data isolation, HIPAA cert, live retail integration, conditions beyond the beachhead, the Cycle Outcome Analyst/dose-response computation, and **Weekly Fresh Produce Fulfillment** (Agent 7 — auto-ordering approved fresh produce via Instacart Health / Kroger; shown only as the out-of-scope `patient-freshbox.html` prototype) are explicitly out of scope for the capstone.

### Prototype (design-review artifacts)
Clickable HTML/CSS mockups of the five-stage loop live in `6 deliverables/prototype/`: `index.html` (walkthrough map), `dietitian-prioritize.html` (D1.5, Agent 3), `dietitian-ratify.html` (D2/D3, Agent 4 + comorbidity rules), `patient-swap.html` (P2, the USP choose-moment ⭐), `patient-dashboard.html` (P4, macro/mineral dashboard + weekly nudge), `patient-freshbox.html` (P5, future/out-of-scope).

---
### Dataset — how the reference table is built *(honest-sources note)*
A **joined reference dataset derived from two real sources**, not a fabricated one:
- **Real prices:** Walmart grocery snapshot (Kaggle, Sept-2022) — product name, brand, price, category, live product URL.
- **Real nutrients:** USDA FoodData Central (Foundation · SR Legacy · Branded), joined on **`fdc_id`** by the **Food Matcher** Skill offline; package size normalized out of `PRODUCT_NAME`.
- **Scope:** **8 clinically-relevant departments** — Fresh Produce, Meat & Seafood, Dairy & Eggs, Pantry (canned goods/veg, rice/grains/beans, oils & vinegars, soup, pasta), Frozen (produce + meat/seafood), Bakery & Bread (breads, tortillas), Breakfast & Cereal (cereal/granola, hot cereals), Deli — excluding alcohol, candy, snacks, sugary beverages, baking ingredients and desserts. **Pre-computed once** for a fast, reliable demo.
- **Curation:** **8,986 rows**, each with a trusted USDA match (high/medium confidence), a real price, a usable package size, and real nutrients; unmatched/low-confidence rows are archived, not shipped.
- **Columns (38):** price (`price_usd`, `price_per_100g_usd`) · `package_size` · `fdc_id` + `usda_description`/`usda_source`/`match_confidence` · **`serving_size_g` + `household_serving`** (enables the USP amount `Y = target ÷ nutrient-per-serving`) · the per-100 g nutrient panel incl. **`added_sugars_g`** (diabetes angle) · honesty flags in **`data_flags`**.
- **Honest-data rule:** prices and nutrients are always real; only assumed pack sizes, RACC serving estimates, and generic-equivalent micronutrient backfills are synthetic — each flagged in `data_flags` (`assumed_size`, `racc_serving`, `backfilled_micros(...)`).

**Why this is a reshape of the Cooking Plan template, not a new domain:** same engineering shape, but driven by *diagnosed nutrient gaps* — layered with cycle prioritization and comorbidity screening — rather than a generic macro target, which makes the relevance filter and the join Skill more distinctive than the template's defaults.
