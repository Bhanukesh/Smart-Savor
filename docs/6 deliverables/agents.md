# Smart Savor — Agent Architecture

*updated 2026-07-05 (reconciled with `smart-savor-demo-script.md`) · Two layers: (A) product runtime
agents that run the live product, (B) dev-time Claude Code subagents that help build it.*

**Design rule:** Agent = needs judgment + tools + multiple uncertain steps. Skill = a focused,
evaluable reasoning task. Code = deterministic. Don't promote up the ladder without a reason.

**Numbering follows the product lifecycle:** 1 Intake → 2 Ingestion → 3 Prioritization →
4 Swap Sourcing → 5 Nudge. *(6 Orchestrator — the cross-cutting conductor — is **deferred to post-MVP**, not built for v1.)*

**How to read "How it uses AI":** each agent lists exactly where an LLM does the reasoning vs. what
stays deterministic code. The AI earns its place only where there's genuine judgment; everything
tallyable stays code (cheaper, testable, and honest).

---

# Part A — Product Runtime Agents

Orchestrated by the **Claude Agent SDK runner**. Two Skills (Food Matcher, Gap Resolver) are shared
tools, not agents. **Five agents build for v1** (Agent 6 Orchestrator is **deferred — post-MVP**);
Agent 1 (Intake) is already built.

```
  onboard ──────────────▶ observe ──────▶ prioritize ─▶ recommend ─▶ sustain
 ┌───────────┐      ┌──────────────┐   ┌───────────┐  ┌──────────┐ ┌──────────┐
 │1. Patient │      │2. Ingestion  │   │3. Cycle   │  │4. Swap + │ │5. Nudge /│
 │  Intake   │─────▶│  receipts    │──▶│ Prioriti- │─▶│ Approved-│▶│ Adherence│
 │ (built)   │      │  + logs      │   │  zation   │  │List draft│ │          │
 └───────────┘      └──────┬───────┘   └─────┬─────┘  └────┬─────┘ └────┬─────┘
                    Skill A │           Opus  │  Skill B    │           │
                 (Food Match)│                │ (Gap Resolver)          │
                    ┌────────▼────────────────▼─────────────▼───────────▼──┐
                    │        Postgres + price×nutrient join (code)          │
                    └───────────────────────────────────────────────────────┘
              ┌──────────────────────────────┐
   triggers ─▶│ 6. Re-planning Orchestrator  │  (conductor — DEFERRED, post-MVP)
 (new lab,    └──────────────────────────────┘
  receipt, log, budget, dislike, weekly cron, price refresh)
```

### Agent 1 — Patient Intake Ingestion Agent (BUILT)  ·  Haiku 4.5 → escalate to Opus on ambiguity
*The lifecycle starts here. Implemented in `smart-savor-mcp/intake_agent.py` (live / CLI / mock backends).*
- **Responsibility:** read one patient intake document → structured profile (demographics, measured
  vitamin/mineral levels, medical history, dietary constraints); persist via the MCP.
- **How it uses AI:** **single-shot structured extraction** (not an agent loop) — Claude vision/document
  reading forced through one tool call so output is schema-valid JSON. Every field carries a
  **confidence + needs_review** flag; the model transcribes exactly and **never fabricates** a value it
  can't read, emitting `insufficient_data` when too sparse.
- **Stays as code:** the mock deterministic parser, the schema→store mapping, `review_fields` assembly.
- **Boundary:** never sets clinical gaps/targets — those are clinician-owned.
- **Tools:** Anthropic SDK (or `claude` CLI), Health & Pantry MCP write.

### Agent 2 — Ingestion Agent: Receipts + Logs (wraps Skill A)  ·  Haiku 4.5 → escalate to Sonnet
*Ingests BOTH the purchase signal (receipts) and the consumption signal (logs). Feeds the habit model.*
- **Responsibility:** turn receipts → purchase model, and photo/voice/text logs → consumption events.
- **Inputs:** uploaded receipt images/PDFs; patient food logs (photo, voice, or text).
- **How it uses AI:** **Claude vision** reads receipts and food photos; **transcription** handles voice
  logs; the model **normalizes messy item names** and **resolves ambiguous items** to the right USDA
  FDC entry via **Skill A (Food Matcher)** — fuzzy/semantic matching that exact strings can't do. It
  emits an explicit **"insufficient/ambiguous data"** state rather than fabricating (honesty first).
- **Stays as code:** "did SKU X appear," frequency tallies, dedupe, and the **purchase-vs-consumption
  reconciliation** (set difference) + **consumption-confidence assignment** (photo > nudge-confirmed >
  inferred). No judgment there — pure bookkeeping.
- **Output:** updated habit model (purchases) + confirmed-consumption records with confidence.
- **Tools:** Claude vision/transcription, Health & Pantry MCP write, **Skill A**.

### Agent 3 — Cycle Prioritization Agent ⭐  ·  Opus 4.8
- **Responsibility:** turn a full lab deficiency list into the confirmed 6–10 focus set for the cycle.
- **Inputs:** all deficiencies (latest lab), patient conditions, constraints, the habit model (from
  Agent 2), prior-cycle carry-overs.
- **How it uses AI:** clinical *judgment* — weighs severity × condition-relevance × synergy/conflict
  (pull Vit C ↔ iron together; defer Calcium vs. iron) × cost-to-close × disruption, and writes a
  one-line dietitian-acceptable *why* per pick. This is multi-factor reasoning no formula captures,
  which is why it earns Opus.
- **Stays as code:** the severity math and the 10-item capacity counter. The agent reasons; code tallies.
- **Output:** draft focus set + reasons → **UI D1.5** for dietitian **confirm/override**.
- **Tools:** Health & Pantry MCP, USDA MCP.

### Agent 4 — Swap Sourcing & Approved-List Drafting Agent ⭐  ·  Sonnet 4.6
*The USP engine. Drafts the ratifiable menu AND recomputes on patient choice.*
- **Responsibility:** for a focus gap, (a) draft a **comorbidity-screened approved list** of gap-closing
  foods for the dietitian to ratify, (b) rank it, and (c) when the patient picks a food, **recompute
  the amount** that closes the same target.
- **Inputs:** focus gap + habit model + constraints + patient conditions (for comorbidity screening).
- **How it uses AI:**
  1. **Drafting the menu** — selects gap-closing foods and, critically, applies **comorbidity
     screening**: reasons about whether a candidate that closes gap X could worsen condition Y (e.g.
     a potassium-rich swap for a T2D + cardiac/CKD-risk patient) and drops/flags it. *This is clinical
     judgment — see the safety model below.*
  2. **Framing the swap** — best-first "from → to," how much of the gap it closes, disruption level.
- **Stays as code:** gap-closing-efficiency ranking, the **amount recompute** (Y = target ÷
  nutrient-per-serving — pure arithmetic once the food is chosen), budget/cost sorting, dislike/
  restriction filtering, the "no viable swap" check.
- **Output:** ratifiable menu → dietitian; then the patient-chosen swap with recomputed amount, target
  fully closed + sign-off → **UI D2/D3**.
- **Tools:** Health & Pantry MCP (price×nutrient), Open Food Facts MCP. Invokes **Skill B (Gap Resolver)**.

> **Comorbidity-safety model (DECIDED): hybrid, human-owned.** The agent applies known **hard rules**
> (a condition→contraindicated-nutrient table — cheap, auditable safety net) AND uses AI to **flag**
> uncertain interactions, but the **dietitian ratifies** and owns the final clinical call (EPIC 3.3).
> This keeps "agent drafts, clinician ratifies," preserves the liability posture, and never lets an
> LLM be the last word on safety.

### Agent 5 — Nudge / Adherence Agent  ·  Haiku 4.5
*The weekly loop — carries mid-cycle engagement (EPIC 6).*
- **Responsibility:** detect bought-but-not-logged gap foods and send one gentle, personalized nudge.
- **How it uses AI:** **natural-language generation** — compose a *kind, specific* nudge that ties the
  exact food the patient bought to their clinical goal ("did you get to have the spinach? it's your
  fastest way to close that magnesium gap"), framed as help, not surveillance. The phrasing is the
  judgment; the model personalizes tone/context per patient.
- **Stays as code:** the **trigger** (receipts − logs = bought-but-not-logged, narrowed to gap-relevant
  foods), the **weekly cadence** gate (never daily), and writing the nudge-confidence record on reply.
- **Output:** one weekly nudge; a between-visit adherence read for the dietitian dashboard.
- **Tools:** Health & Pantry MCP, notification/Resend.

### Agent 6 — Re-planning Orchestrator (the conductor)  ·  Sonnet 4.6  ·  ⏸ DEFERRED (post-MVP)
> **Deferred — not built for v1.** In v1, re-planning happens **on-demand**: the API layer invokes the
> affected agent directly when a user acts (e.g. a new receipt runs Agent 2), and the weekly nudge
> (Agent 5) runs on a simple scheduled job. The autonomous trigger-routing orchestrator below is the
> future state, kept here for the roadmap.

*Cross-cutting: runs across the whole lifecycle, dispatching Agents 1–5.*
- **Responsibility:** background planning that re-plans. Wakes on triggers, decides *what changed*,
  re-runs only the affected agents, summarizes for the dietitian.
- **Triggers:** new lab (→ Agent 3), new receipt (→ 2 then 4), new log (→ 2, reconcile),
  budget edit / disliked item (→ 4), **weekly cron (→ full refresh + fire Agent 5 nudge)**, price refresh.
- **How it uses AI:** lightweight **routing judgment** — map a trigger + a diff of what changed to the
  minimal set of agents to run, in order, without recomputing unaffected work (cost discipline). Then
  compose a concise change summary and decide if something **needs dietitian attention**.
- **Stays as code:** the trigger queue, scheduler, and change-detection diffs.
- **Tools:** scheduler (Celery/cron), the other agents.

### Agent 5.5 — Food Coach (BUILT, live app)  ·  Sonnet 5
*Patient-facing chat, cross-cutting alongside 4/5. Lives in the actual Next.js app (`lib/foodCoach.ts`,
`app/api/patients/[id]/coach`, `/me/coach`) — NOT the `smart-savor-mcp/` Python prototype the other
five agents are documented against; that folder isn't wired into the live app.*
- **Responsibility:** let the patient ask about their focus set and make the USP choose-a-food
  moment by conversation instead of tapping a card.
- **How it uses AI:** a genuine multi-step **tool-use loop** (the first one in the codebase — Agents
  1–5 above are single-shot or deterministic-code-heavy) — the model decides which reads it needs
  (`get_profile`, `get_focus_set`, `get_approved_list`) and whether the patient's request maps to a
  real ratified item, then calls `choose_food`.
- **Stays as code:** the recompute itself — `choose_food` calls the exact same `createChoice` →
  `computeChoice` path the swap screen's tap-to-pick uses, so a chat-driven choice and a tap-driven
  choice can never disagree.
- **Boundary:** read-only over profile/focus-set/approved-list; the only write is `choose_food`, and
  only against items already on a **ratified** approved list — it can never invent a food or imply a
  target changed.
- **Tools:** Anthropic SDK (`@anthropic-ai/sdk`), `lib/data.ts` (Prisma).

### Post-MVP runtime agents (documented, not built for capstone)
- **Cycle Outcome Analyst** — baseline vs. 3-month re-test → what graduated / carries over, drafts the
  D4 cycle summary, and **computes the internal dose-response** (adherent vs. non-adherent improvement)
  that underwrites the attribution claim (see `smart-savor-hypothesis.md`).
- **Agent 7 — Fulfillment / Cart-Builder (signature future differentiator, OUT OF SCOPE for v1).**
  Powers **Weekly Fresh Produce Fulfillment**: takes the dietitian-*ratified*, patient-*chosen* swaps
  and builds a weekly cart of fresh produce (fruits & vegetables) for one-tap checkout / delivery — one
  week at a time — closing the loop recommendation→doorstep. It slots in *after* ratification and choice,
  so clinical-safety and USP guarantees are untouched. **How it uses AI:** map chosen foods → retailer
  catalog SKUs (fuzzy matching) and assemble the cart; the LLM handles catalog ambiguity, code handles
  quantities/checkout. **Consent-first:** v1 hands off a cart for the patient to approve — never silent
  auto-charging. **Tools:** Instacart Health / Kroger APIs, Health & Pantry MCP. Unlocks "Food is
  Medicine" produce-prescription reimbursement. *Phase 3 — not built for the capstone.*

---

# Part B — Dev-time Claude Code Subagents

Subagents (via the Claude Code Agent tool) that accelerate the *build* — not shipped in the product.

| Subagent | Job | When |
|---|---|---|
| **Join-Pipeline Builder** | Build & validate the offline Walmart×USDA join; normalize units out of `PRODUCT_NAME`; flag fields needing imputation. | Early — riskiest data work |
| **Skill Eval Runner** | Run + maintain eval suites (Food Matcher: bell pepper/roma/broccoli/ambiguous; Gap Resolver: vit-C-banana / iron-veg / **choose-different-food→correct-amount** / budget-capped). | Continuously, in CI |
| **MCP Scaffolder** | Scaffold + test the custom Health & Pantry MCP (schemas, tools incl. new ones for approved lists, logs, consumption confidence, nudges). | Early |
| **Receipt/Log-Parse Tester** | Throw messy real receipts AND food-log photos/voice at the parser; measure extraction accuracy; surface failure modes. | During the data spike |
| **Comorbidity-Rules Curator** | Draft & validate the condition→contraindicated-nutrient rule table backing Agent 4's safety net; keep it dietitian-reviewed. | Before Swap Sourcing ships |
| **UI Component Builder** | Generate React components from the UI spec (swap menu w/ choose→recompute, macro/mineral dashboard, gap row, cycle timeline, status chips). | UI phase |
| **Test/Lint Guardian** | pytest/eslint coverage; keep the build green. | Continuously |

**How to invoke:** spin these up from Claude Code with the Agent tool as work parallelizes (e.g.
Join-Pipeline Builder + MCP Scaffolder concurrently during the data spike).

---

## Mapping to capstone bars
- **Bar 2 (re-plans):** the **Agent 5 weekly nudge loop** + on-demand agent re-runs cover this in v1; the full **Agent 6 Orchestrator (trigger-routing) is deferred to post-MVP**.
- **Bar 3 (sources, custom MCP):** all agents read via the MCP servers; MCP Scaffolder builds the custom one.
- **Bar 5 (Skills, dual-invocation):** Skill A used by Agent 2 (prod) **and** the Join-Pipeline Builder
  subagent (dev) → dual-invocation. Skill B used by Agent 4.
- **Bar 7 (traces):** every runtime agent + Skill call traced in Langfuse (tag agent_name, patient_id,
  cycle_id, trigger).

## Build order
1. **Spike:** Join-Pipeline Builder + Receipt/Log-Parse Tester + MCP Scaffolder → validate the data layer.
2. **USP core:** Agent 4 (Swap Sourcing + approved-list drafting, w/ Comorbidity-Rules Curator) — the
   priority; then Agent 3 (Prioritization). Agent 1 (Intake) already built.
3. **The loop:** Agent 2 (receipts + logs) → Agent 5 (nudge). *(Agent 6 orchestrator + triggers — deferred to post-MVP.)*
4. **UI:** UI Component Builder against the spec (the USP moment first).
5. **Post-MVP:** Cycle Outcome Analyst (+ dose-response).

*See `smart-savor-tech-stack.md` for runtime/model details and `smart-savor-hypothesis.md` for the
attribution/dose-response plan Agent 5 and the Outcome Analyst feed.*
