# Smart Savor — End-to-End Architecture & Build Plan

*2026-07-05 · What we need to build the full flow: system layers, the MCP tool surface (built vs.
to-build), data-model additions, and a build backlog ordered by the product pipeline. Companion to
`smart-savor-tech-stack.md` (stack choices) and `smart-savor-agents.md` (agent roles).*

---

## 1. System architecture (layers)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  FRONTEND — Next.js + React + Tailwind (one codebase, two views)            │
│  /rx/*  Dietitian command center (D1–D6)   /me/*  Patient app (P1–P5*)      │
└───────────────┬───────────────────────────────────────────────────────────┘
                │ REST/JSON
┌───────────────▼───────────────────────────────────────────────────────────┐
│  BACKEND / API — Python + FastAPI (async)                                   │
│  + background re-planner (Celery/RQ + Redis, or APScheduler for capstone)   │
└───────────────┬───────────────────────────────────────────────────────────┘
                │ invokes
┌───────────────▼───────────────────────────────────────────────────────────┐
│  AGENT RUNTIME — Claude Agent SDK (headless)                                │
│  Agents 1–6 (see smart-savor-agents.md) · Skills A (Food Matcher) + B (Gap  │
│  Resolver) · model-tiered Opus/Sonnet/Haiku · traced in Langfuse            │
└───────────────┬───────────────────────────────────────────────────────────┘
                │ tools (MCP)
┌───────────────▼───────────────────────────────────────────────────────────┐
│  SOURCES — 3 MCP servers                                                    │
│  USDA FDC (off-the-shelf) · Open Food Facts (off-the-shelf) ·               │
│  **Health & Pantry Profile (CUSTOM)** ← the bespoke source                  │
└───────────────┬───────────────────────────────────────────────────────────┘
                │
┌───────────────▼───────────────────────────────────────────────────────────┐
│  DATA — PostgreSQL (+ pgvector) · pre-computed Walmart×USDA price×nutrient   │
│  join · S3-compatible object storage (receipts, food-log media, PDFs)       │
└───────────────────────────────────────────────────────────────────────────┘
```

Today the custom MCP is backed by an **in-memory seed store** (`store.py`); production swaps it for
Postgres. **The MCP tool surface is the contract and does not change** across that swap.

---

## 2. End-to-end data flow (pipeline → agents → tools → screens)

| Stage | Agent | Key MCP tools | Screen |
|---|---|---|---|
| Onboard profile | 1 Intake (BUILT) | `save_patient_intake`, `get_patient_profile` | D5 / intake |
| Observe behavior | 2 Ingestion (receipts+logs) | `log_intake` (purchase), **`log_consumption`** (new), Skill A | P1, P3 |
| Prioritize | 3 Cycle Prioritization | `get_flagged_gaps`, `get_habit_model`, `save_focus_set` | D1.5 |
| Draft safe menu | 4 Swap Sourcing | **`get_contraindication_rules`** (new), `query_nutrient_sources`, **`save_approved_list`** (new) | D2/D3 |
| Ratify menu | (dietitian) | **`ratify_approved_list`** (new) | D2/D3 |
| Patient chooses | 4 Swap Sourcing (recompute) | **`get_approved_list`** (new), **`save_patient_choice`** (new) | P2 |
| Sustain | 5 Nudge | **`get_bought_not_logged`** (new), **`record_nudge`/`record_nudge_response`** (new) | P4, nudge |
| Prove | (Outcome Analyst, post-MVP) | **`save_lab`**, **`get_outcomes`**, **`get_adherence`** (new) | D4 |
| Conduct | 6 Orchestrator *(deferred, post-MVP)* | all of the above, on triggers | — |

---

## 3. Custom MCP tool surface — built vs. to-build

**Built today (`server.py`):**
| Tool | Purpose |
|---|---|
| `get_patient_profile` | demographics, conditions, measured levels, constraints |
| `get_flagged_gaps` | clinician-flagged nutrient gaps (agent never sets) |
| `get_habit_model` | what the patient buys (purchase frequency) |
| `get_cycle` | active 3-month cycle + confirmed focus set |
| `query_nutrient_sources` ⭐ | price×nutrient join, ranked by gap-efficiency (or cost) |
| `save_focus_set` | persist dietitian-confirmed focus set |
| `log_intake` | add an observed item to the habit model (**purchase**) |
| `save_patient_intake` | persist the intake-agent profile (never gaps/habit/cycle) |

**To build (new tools for the refined flow):**
| Tool | Purpose | Feeds |
|---|---|---|
| `get_contraindication_rules(conditions)` | hard condition→contraindicated-nutrient rules | Agent 4 comorbidity screen |
| `save_approved_list(patient_id, gap, candidates)` | persist agent-drafted menu (status=`draft`, with `comorbidity_flag`s) | Agent 4 draft |
| `ratify_approved_list(patient_id, gap, items)` | dietitian approve/edit/remove → status=`ratified` | D2/D3 |
| `get_approved_list(patient_id, gap)` | the ratified menu the patient chooses from | P2 |
| `save_patient_choice(patient_id, gap, chosen_food, amount)` | store choice + recomputed amount (the USP result) | P2 |
| `log_consumption(patient_id, food, source, date, confidence)` | **consumption** event (photo>voice/text) — distinct from purchase | Agent 2 |
| `get_consumption(patient_id, since?)` | consumption events for reconciliation/dashboard | Agents 2/5, P4 |
| `get_bought_not_logged(patient_id, gap_relevant=True)` | receipts − logs (the nudge trigger; computed in store/code) | Agent 5 |
| `record_nudge(patient_id, food, gap, message)` | log a sent nudge (enforce weekly cadence) | Agent 5 |
| `record_nudge_response(patient_id, food, response)` | write a nudge-confidence consumption record on "yes" | Agent 5 |
| `save_lab(patient_id, kind, values)` | baseline / 3-month re-test labs | D4, Outcome Analyst |
| `get_outcomes(patient_id, cycle_id)` | per-gap improvement, cycle record | D4 |
| `get_adherence(patient_id)` | confirmed-consumption of gap foods (dose-response + dashboard) | attribution, P4, D2 |

---

## 4. Data-model additions (store → Postgres tables)

Existing seed fields: patient profile, `flagged_gaps`, `habit_model`, `cycle{focus_set}`,
`REFERENCE_TABLE`. Add:

- **`approved_lists`** — (patient_id, gap, status[draft|ratified], items[{food, nutrient_per_serving,
  disruption, cost_per_nutrient, comorbidity_flag}], ratified_by, ratified_at).
- **`patient_choices`** — (patient_id, gap, chosen_food, amount_to_close, gap_closed_pct, chosen_at).
- **`consumption_events`** — (patient_id, food, fdc_id, date, source[photo|voice|text|nudge|inferred],
  confidence). *Distinct from the purchase-side `habit_model`.*
- **`nudges`** — (patient_id, food, gap, message, sent_at, response, response_at) + a weekly-cadence guard.
- **`contraindication_rules`** — (condition, contraindicated_nutrient|food, reason). Dietitian-reviewed;
  curated by the dev-time Comorbidity-Rules Curator.
- **`labs`** — (patient_id, cycle_id, kind[baseline|retest], date, values[nutrient→measured]).
- **`outcomes`** — (patient_id, cycle_id, gap, baseline, retest, improved[bool], adherence_score).
- **cycle** extends with `retest_due`, checkpoint history (chronic = recurring cycles).

**Reconciliation (code, not an agent):** `purchased(set from receipts) − consumed(set from logs)` →
bought-but-not-logged; consumption confidence ranked photo > nudge-confirmed > inferred-from-receipt.

---

## 5. Build backlog (ordered by pipeline — Agent 4 / the USP first)

**Phase 0 — Spike (validate the risky data layer)** *(dev-time subagents)*
1. Join-Pipeline Builder + Receipt/Log-Parse Tester + MCP Scaffolder → prove ingestion accuracy + the
   Walmart×USDA join. **Gate: is the wedge real?**

**Phase 1 — USP core (the money path)**
2. New MCP tools: `get_contraindication_rules`, `save/ratify/get_approved_list`, `save_patient_choice`.
3. **Agent 4 — Swap Sourcing & Approved-List Drafting** (draft_list + patient_choice modes) + Skill B +
   Comorbidity-Rules Curator seeds `contraindication_rules`.
4. **Agent 3 — Cycle Prioritization** (Agent 1 Intake already built).
5. UI: D1.5 ratify → P2 the **choose → recompute → still-approved** moment (the demo hero).

**Phase 2 — The loop**
6. New MCP tools: `log_consumption`, `get_consumption`, `get_bought_not_logged`, `record_nudge(_response)`.
7. **Agent 2 — Ingestion: receipts + logs** + reconciliation (code) + confidence model.
8. **Agent 5 — Nudge** (weekly cadence, bought-not-logged trigger).
9. **Agent 6 — Orchestrator** + triggers (new_lab / receipt / log / budget / weekly_cron / price). ⏸ *Deferred — post-MVP; v1 re-plans on-demand per user action + a simple weekly nudge job.*
10. UI: P4 macro/mineral dashboard (honesty guardrail) + nudge surface + D2 adherence read.

**Phase 3 — Proof & infra**
11. New MCP tools: `save_lab`, `get_outcomes`, `get_adherence`. Lab loop + D4 outcome screen.
12. Custom dual-portal auth (no Clerk — see `tech-stack.md` §6 / `er-design.md` §Part 1), encryption, Langfuse traces, cost cap, deploy (HTTPS).

**Phase 4 — Post-MVP / expansion** (documented, not built for capstone)
13. Cycle Outcome Analyst + dose-response. **Agent 7 — Fulfillment / Cart-Builder** (Weekly Fresh
    Produce Fulfillment — out of scope; see `smart-savor-agents.md`). White-label, reimbursement, CGM.

---

## 6. Production migration (swap the scaffold, not the contract)
- Replace `store.py` in-memory dicts with **PostgreSQL** tables (§4) + **Alembic** migrations.
- Add **pgvector** for the Food Matcher's semantic name→FDC match.
- Load the **pre-computed Walmart×USDA join** once at build time, filtered to Produce, Dairy,
  Meat/Seafood, Frozen. Prices/nutrients real; impute only genuinely-missing fields (flagged).
- **The MCP tool signatures (§3) do not change** — the agents and UI are insulated from the swap.

## 7. Honest build status
- **Built:** custom MCP (8 tools), the seed store, the price×nutrient `query_nutrient_sources`, and
  **Agent 1 — Patient Intake** (`intake_agent.py`, live/CLI/mock).
- **Next (highest value):** the new approved-list tools + **Agent 4** — they power the USP and the demo.
- **Remaining:** the loop (Agents 2/5/6 + consumption/nudge tools), the proof layer (labs/outcomes),
  and infra. Post-MVP: Outcome Analyst, Agent 7 fulfillment.
