# Smart Savor — Tech Stack

*2026-06-27 · Chosen to satisfy the capstone bars (custom MCP, eval-backed Skills, multi-modal outputs, traces, deploy) and the 3-month-cycle product.*

---

## At a glance

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript + Tailwind** | Two views (dietitian command center + patient app) from one app; fast to build the cycle/dashboard UIs |
| Backend / API | **Python + FastAPI** | Same language as the agent layer and WeasyPrint; clean async API |
| Agent runtime | **Claude Agent SDK (Python)** | Runs the agents on-demand + invokes Skills *(autonomous background re-planning / Agent 6 is post-MVP)* |
| LLM | **Claude — Opus 4.8 / Sonnet 4.6 / Haiku 4.5** | Tiered by task (see §3) |
| Sources | **3 MCP servers (2 off-the-shelf + 1 custom)** | Bar 3 requirement |
| Datastore | **PostgreSQL (+ pgvector)** | Relational patient/cycle data + semantic match for the Food Matcher |
| Auth | **Custom — dual login portals (no Clerk)** | Bar 6/7; gates health data. Separate dietitian + patient logins over one `users` table (see `er-design.md` §Part 1) |
| PDF | **WeasyPrint** | Bar 4 multi-modal output |
| Email | **Resend** | Bar 4 optional 3rd output lane |
| Observability | **Langfuse** | Bar 7 traces + spend ceiling |
| Deploy | **`<student>.apps.human-angle.com`, HTTPS, cost cap** | Bars 6–7 |

---

## 1. Frontend
- **Next.js (App Router) + React + TypeScript.**
- **Tailwind CSS** + a component lib (shadcn/ui or Radix) for the swap cards, status chips, cycle timeline, gap tables.
- **Recharts** (or lightweight SVG) for trend sparklines and before→after outcome bars.
- **TanStack Query** for server state (patient/cycle data).
- Two route groups from one codebase: `/rx/*` (dietitian command center — D1–D6) and `/me/*` (patient — P1–P4). Shared design tokens, different density/navigation.

## 2. Backend / API
- **Python 3.12 + FastAPI** — REST/JSON API for the frontend; async endpoints for ingestion and planning.
- **SQLAlchemy + Alembic** — ORM + migrations.
- **Pydantic** — request/response + structured LLM I/O validation.
- **Celery / RQ + Redis** (or APScheduler for the capstone) — the **background re-planner**: weekly cron + event-triggered re-plans (new lab, new receipt, budget edit, disliked item, price refresh).

## 3. Agent Layer (Claude Agent SDK)
- **Claude Agent SDK (Python)** runs the headless prod agent that ingests changes and regenerates cycle plans.
- **Model tiering** (cost-aware, per the spend ceiling):
  - **Opus 4.8** (`claude-opus-4-8`) — hard reasoning: cycle prioritization (auto-selecting the 6–10 with synergy/conflict logic), ambiguous swap decisions.
  - **Sonnet 4.6** (`claude-sonnet-4-6`) — default for gap-resolution and most agent steps.
  - **Haiku 4.5** (`claude-haiku-4-5-20251001`) — cheap/high-volume: receipt line-item normalization, bulk fuzzy matching.
- **Skills (Bar 5, eval-backed):**
  - **Skill A — Food Matcher** (product name → USDA FDC id; fuzzy/semantic). Invoked from **both** Claude Code (dev/offline join) **and** the Agent SDK runner (prod/new items) → satisfies dual-invocation.
  - **Skill B — Nutrient Gap Resolver** (gap + diet + constraints + budget → ranked swaps by cost-per-nutrient + disruption).
- **Receipt ingestion** uses **Claude vision (multimodal)** to read receipt images/PDFs into structured line items — no separate OCR vendor needed, and it handles messy real-world receipts better than classic OCR.

## 4. Sources — MCP Servers (Bar 3)
1. **USDA FoodData Central** — *off-the-shelf MCP.* Per-food micronutrients.
2. **Open Food Facts / recipe HTTP-fetch** — *off-the-shelf MCP.* Branded items + recipe ingredients.
3. **Health & Pantry Profile** — **custom MCP authored in Claude Code.** Stores flagged gaps, constraints, dislikes, budget, logged intake, and **serves the stitched price × nutrient reference table.** This is the bespoke source.

*Future integration (OUT OF SCOPE for v1):* **Instacart Health / Kroger APIs** for **Weekly Fresh Produce Fulfillment** — building a weekly cart of the approved fresh produce for one-tap checkout/delivery (powered by a future Agent 7 — Fulfillment). Consent-first cart hand-off, not silent auto-charging. A Phase 3 expansion; not wired for the capstone.

## 5. Data Layer
- **PostgreSQL** — patients, cycles, focus sets, gaps, swaps, approvals, labs, receipts, intake.
- **pgvector** — embeddings for the Food Matcher's semantic match (product name ↔ FDC entry).
- **The join pipeline (data-science work):**
  - Real prices: **Walmart grocery snapshot (Kaggle, Sept-2022)**.
  - Real nutrients: **USDA FoodData Central**.
  - Food Matcher links them **offline**; unit/size normalized out of `PRODUCT_NAME`; synthetic imputation only for genuinely missing fields (e.g. pack size).
  - **Pre-computed once** and filtered to nutrient-relevant departments (Produce, Dairy, Meat/Seafood, Frozen) for fast, reliable runtime.
- **Object storage** (S3-compatible) for uploaded receipt images and generated PDFs.

## 6. Auth & Security (Bars 6–7)
- **Custom auth — two separate login portals (no third-party provider).** Dietitians log in at `/login/dietitian` → `/rx/*`; patients log in at `/login/patient` → `/me/*`. A shared `users` table holds credentials (email, bcrypt hash cost-12, `role`, nullable FK to `dietitians` or `patients`); the `role` column is the gate so a dietitian token can never reach a patient endpoint and vice versa. See `er-design.md` §Part 1 for the full table + auth-flow spec.
- **Sessions** — httpOnly cookie + server-side Redis session (durable fallback row in Postgres); simpler to revoke than JWT.
- **Encryption** — TLS in transit; encryption at rest for health data and receipts.
- **Tenancy** — `practices` is the top-level tenant; patients + dietitians scope to a practice. Full multi-tenant isolation hardening is a P2/future item, not capstone.
- **Stance:** security-conscious design; **no HIPAA-compliance claim** made.

## 7. Outputs (Bar 4 — multi-modal)
- **Dashboard UI** (headline) — the dietitian command center (D1–D4).
- **WeasyPrint** — weekly Nutrient Correction Plan + deduped shopping list (HTML→PDF).
- **Resend** — optional email digest to practitioner/patient on plan changes / new report.

## 8. Observability & Cost (Bar 7)
- **Langfuse** — traces every agent run, Skill invocation, and token spend.
- **Spend ceiling / cost cap** — hard budget cap on the deployment; model tiering (§3) keeps per-run cost down.

## 9. Deployment & Infra (Bars 6–7)
- **Deploy:** `<student>.apps.human-angle.com` over **HTTPS**.
- **Containerized** (Docker) — frontend, API, agent runner, Postgres, Redis.
- **CI/CD** — GitHub Actions (lint, run Skill eval suites, deploy).
- **Cost cap** enforced at the platform level (W5/W8).

## 10. Dev Tooling
- **Claude Code** — primary dev environment; builds the custom MCP and runs the offline join (where Food Matcher is invoked in dev).
- **pytest** — unit tests + the **Skill eval suites** (Food Matcher: bell pepper / roma / broccoli / ambiguous negative; Gap Resolver: vit-C-banana / iron-vegetarian / budget-capped).
- **ruff + black** (Python), **eslint + prettier** (TS).

---

## Build-order note
The riskiest dependency is **receipt ingestion accuracy** (§3) and the **offline join** (§5) — validate both with a spike before building the cycle UI on top. If Claude-vision receipt parsing or the Food Matcher accuracy is weak, the whole input pipeline is compromised. See `smart-savor-readiness.md`.

For the **end-to-end architecture, the full MCP tool surface (built vs. to-build), data-model additions, and the phased build backlog**, see `smart-savor-architecture.md`.
