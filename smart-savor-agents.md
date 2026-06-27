# Smart Savor — Agent Architecture

*2026-06-27 · Two layers: (A) product runtime agents that run the live product, (B) dev-time Claude Code subagents that help build it.*

**Design rule:** Agent = needs judgment + tools + multiple uncertain steps. Skill = a focused, evaluable reasoning task. Code = deterministic. Don't promote up the ladder without a reason.

---

# Part A — Product Runtime Agents (Lean 4)

Orchestrated by the **Claude Agent SDK runner**. Two Skills (Food Matcher, Gap Resolver) are shared tools, not agents.

```
                ┌─────────────────────────────┐
   triggers ──▶ │  4. Re-planning Orchestrator │  (the conductor)
 (new lab,      └───────┬─────────┬─────────┬──┘
  receipt,             │         │         │
  budget,      ┌───────▼──┐ ┌────▼─────┐ ┌─▼──────────────┐
  dislike,     │ 3. Recpt │ │ 1. Cycle │ │ 2. Swap        │
  weekly cron) │ Ingestion│ │ Prioriti-│ │ Sourcing       │
               │  Agent   │ │  zation  │ │  Agent         │
               └────┬─────┘ └────┬─────┘ └────┬───────────┘
            Skill A │       Opus │      Skill B│ + custom MCP
         (Food Match)│            │   (Gap Resolver)
               ┌────▼────────────▼────────────▼───┐
               │   Postgres + price×nutrient join  │ (deterministic code)
               └───────────────────────────────────┘
```

### Agent 1 — Cycle Prioritization Agent ⭐
- **Responsibility:** turn a full lab deficiency list into the confirmed 6–10 focus set for the cycle.
- **Inputs:** all deficiencies (latest lab), patient conditions, constraints, prior-cycle carry-overs.
- **Reasoning:** rank by severity · condition-relevance · synergy/conflict · cost-to-close · disruption; pull synergistic gaps in (Vit C ↔ iron), defer conflicts (Calcium vs iron); write a one-line *why* per pick; enforce the 10-item capacity ceiling.
- **Output:** draft focus set + reasons → surfaced in **UI D1.5** for dietitian **confirm/override**.
- **Tools:** Health & Pantry custom MCP, USDA MCP. **Model:** Opus 4.8.
- **Stays as code:** the severity math and capacity counter; the agent reasons, code tallies.

### Agent 2 — Swap Sourcing Agent (wraps Skill B)
- **Responsibility:** per focus gap, produce ≥3 ranked in-budget swaps.
- **Inputs:** focus gap + current habit model + constraints + weekly budget.
- **Reasoning:** query the join table, score by cost-per-nutrient + disruption, respect dislikes/restrictions, surface "no in-budget swap" honestly.
- **Output:** ranked swap candidates → **UI D2/D3** swap cards.
- **Tools:** custom MCP (price×nutrient table), Open Food Facts MCP. Invokes **Skill B (Gap Resolver)**. **Model:** Sonnet 4.6.
- **Stays as code:** cost-per-nutrient ranking + budget arithmetic.

### Agent 3 — Receipt Ingestion Agent (wraps Skill A)
- **Responsibility:** receipts → structured line items → habit model.
- **Inputs:** uploaded receipt images/PDFs.
- **Reasoning:** read via **Claude vision**, normalize names, resolve ambiguous items, map to FDC via **Skill A (Food Matcher)**, handle unreadable/partial gracefully ("insufficient data" state).
- **Output:** updated per-patient eating-habit model.
- **Tools:** Claude vision, custom MCP write, **Skill A**. **Model:** Haiku 4.5 bulk → escalate to Sonnet on ambiguity.
- **Stays as code:** "did SKU X appear," frequency tallies, dedupe.

### Agent 4 — Re-planning Orchestrator (the conductor)
- **Responsibility:** Bar 2 — background planning that re-plans. Wakes on triggers, decides *what changed*, re-runs only the affected agents.
- **Triggers:** new lab (→ Agent 1), new receipt (→ Agent 3 then 2), budget edit / disliked item (→ Agent 2), weekly cron (→ full refresh), price snapshot refresh.
- **Output:** orchestrated re-plan; notifications to dietitian (and Resend email if enabled).
- **Tools:** scheduler (Celery/cron), the other 3 agents. **Model:** Sonnet 4.6 (routing).
- **Stays as code:** the trigger queue, change-detection diffs.

### Post-MVP runtime agents (documented, not built for capstone)
- **Adherence Monitor** — new receipts vs approved swaps → "buying 4 of 6" signal + nudge (D2 adherence strip).
- **Cycle Outcome Analyst** — baseline vs re-test → what graduated / carries over, drafts D4 summary.

---

# Part B — Dev-time Claude Code Subagents

Subagents (via the Claude Code Agent tool) that accelerate the *build* — not shipped in the product.

| Subagent | Job | When |
|---|---|---|
| **Join-Pipeline Builder** | Build & validate the offline Walmart×USDA join; normalize units out of `PRODUCT_NAME`; flag fields needing imputation. | Early — it's the riskiest data work |
| **Skill Eval Runner** | Run + maintain the eval suites (Food Matcher: bell pepper/roma/broccoli/ambiguous; Gap Resolver: vit-C-banana/iron-veg/budget-capped); report pass/fail. | Continuously, in CI |
| **MCP Scaffolder** | Scaffold + test the custom Health & Pantry Profile MCP (schemas, tools, the served reference table). | Early |
| **Receipt-Parse Tester** | Throw messy real receipts at the Claude-vision parser; measure extraction accuracy; surface failure modes. | During the §Build-order spike |
| **UI Component Builder** | Generate the React components from the UI spec (swap card, gap row, cycle timeline, status chips). | UI phase |
| **Test/Lint Guardian** | Write pytest/eslint coverage; keep the build green. | Continuously |

**How to invoke:** spin these up from Claude Code with the Agent tool as work parallelizes (e.g. Join-Pipeline Builder + MCP Scaffolder concurrently during the data spike).

---

## Mapping to capstone bars
- **Bar 2 (re-plans):** Agent 4 Orchestrator.
- **Bar 3 (sources, custom MCP):** all agents read via the 3 MCP servers; MCP Scaffolder builds the custom one.
- **Bar 5 (Skills, dual-invocation):** Skill A used by Agent 3 (prod) **and** the Join-Pipeline Builder subagent (dev) → satisfies dual-invocation. Skill B used by Agent 2.
- **Bar 7 (traces):** every runtime agent + Skill call traced in Langfuse.

## Build order
1. **Spike:** Join-Pipeline Builder + Receipt-Parse Tester + MCP Scaffolder → validate the riskiest data layer.
2. **Core agents:** Receipt Ingestion (3) → Cycle Prioritization (1) → Swap Sourcing (2).
3. **Wire the conductor:** Re-planning Orchestrator (4) + triggers.
4. **UI:** UI Component Builder against the spec (D1.5 → D2 → D3).
5. **Post-MVP:** Adherence Monitor, Cycle Outcome Analyst.

*See `smart-savor-tech-stack.md` for runtime/model details and `smart-savor-readiness.md` for why the data spike comes first.*
