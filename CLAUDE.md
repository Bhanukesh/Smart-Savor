# Smart Savor

A dietitian-ratified, patient-choice nutrition app for Type 2 diabetics with cardiac risk. The
dietitian sets a nutrient target; the patient picks which food closes it from a pre-approved
menu; the app computes the exact amount. See `docs/Artifacts/capstone-spec.md` for the full
product spec and `docs/Artifacts/demo-script.md` for the walkthrough narrative.

## Two apps, one backend

- **`app/`, `components/`, `lib/`** — the Next.js (App Router) web app. Single package.json at
  the repo root. Dietitian console lives at `/*` (root), the patient app at `/me/*`, invite-only
  onboarding at `/invite/*`. All server logic (Prisma/Postgres, Claude calls) lives in `lib/`,
  called from `app/api/**/route.ts` handlers — routes stay thin.
- **`mobile/`** — a separate Expo (React Native) app with its own `package.json`, calling the
  same Next.js API routes (`mobile/lib/api.ts`). Mirrors the patient-side (`/me/*`) screens.
  **Expo's SDK has changed significantly** — read `mobile/AGENTS.md` before writing any
  mobile code; don't rely on training-data knowledge of Expo APIs, verify against current docs.
- **`smart-savor-mcp/`** — a standalone Python custom MCP server + reference agent scripts
  (`intake_agent.py`, `swap_sourcing_agent.py`, etc.), the capstone's "custom MCP" deliverable.
  Runs against its own in-memory seed data (`store.py`), **not** the production Postgres
  database — it is not called from the deployed app. Useful for demoing the MCP tool surface
  and the standalone agent logic in isolation.

## Conventions

- **Claude model tiering**: Haiku 4.5 for single-shot structured extraction (receipts, lab
  reports, food logs — all forced `tool_choice`, transcribe-only, never invent a value or judge
  severity), Sonnet 5 for the one place real multi-round reasoning happens, the Food Coach chat
  (`lib/foodCoach.ts`). Keep this split — it's deliberate cost control, not an accident.
- **Photo or PDF uploads** (receipts, lab reports): the parser branches on `mediaType` —
  `application/pdf` sends an Anthropic `document` content block, everything else sends an
  `image` block. See `lib/receiptParser.ts` / `lib/labReportParser.ts`.
- **Auth is split and partially mocked**: patients go through invite-code redemption
  (`lib/invite.ts`) then a session (`lib/auth/session.ts`, real — opaque token + httpOnly
  cookie). Identity verification (`lib/auth/verifyIdentity.ts`) is a stand-in for Auth0 and
  accepts whatever's submitted — say so plainly if this comes up, don't imply it's wired.
  Dietitians currently have **no login wall** on the console routes.
  There is deliberately **no public patient self-signup** — invite code first, always.
  The dietitian side also has no `console.log` middleware or session guard yet.
- **Clinical authority stays human by design**: extraction code transcribes what's on a
  document; it never computes a target, severity, or "gap" — that's deterministic TypeScript
  (e.g. `confirmLabFinding` in `lib/data.ts`), not something trusted to a model call.
- **Error visibility**: upload parse failures (`createReceiptFromUpload`,
  `createLabReportFromUpload` in `lib/data.ts`) log the real error via `console.error` before
  marking `parseStatus: "failed"` — check the `npm run dev` terminal, not just the UI, when an
  upload fails.

## Deploy

`.github/workflows/deploy.yml` builds and deploys on every push to `main` (class Azure
platform — Container App `ca-<team>` in `rg-students-platform`). Never push straight to
`main`; go through a branch + PR. Non-platform-managed env vars/secrets are synced in a
"Sync app config" step in that workflow — see `.claude/skills/add-env-var/` before adding a
new one (it distinguishes secret vs. non-secret, and `NEXT_PUBLIC_*` build-time vars, which
need a different route entirely).

## Local dev

`npm run dev` (runs `docker compose up -d` for Postgres first via `predev`). Needs
`ANTHROPIC_API_KEY` in `.env` for any upload/coach feature to actually call Claude instead of
failing silently-ish (now logged, see above). `mobile/` has its own `npm start` (Expo/Metro,
default port 8081).
