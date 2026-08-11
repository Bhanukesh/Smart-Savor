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
- **Auth is a three-way split**: real Clerk-managed auth for dietitians, real (not mocked)
  Google OAuth or Twilio Verify OTP for patient identity, a real custom session underneath
  either patient path.
  - **Dietitians** sign in via **Clerk** (`@clerk/nextjs`) at `/login/dietitian` —
    Google/Microsoft only, no password, no email/password connection enabled. The Clerk
    tenant is set to **Restricted mode**: nobody can create a Clerk account at all without an
    invitation, so "who can sign up" is enforced by Clerk itself, not app code. A Clerk
    session alone still isn't sufficient, though — `lib/auth/dietitian.ts` is the app-side
    half, resolving a Clerk identity to an actual `Dietitian`/`User` row two ways: a
    pre-provisioned "open seat" (`prisma/seed.ts`'s bootstrap dietitian, claimed by email on
    first sign-in) or a colleague invited from `/team` (`createColleagueInvitation()`, which
    stamps the target `Dietitian.id` onto the Clerk invitation's `publicMetadata`; the webhook
    at `app/api/webhooks/clerk/route.ts` creates the `User` row once they actually accept).
    A Clerk session with no matching row lands on `/login/dietitian/no-access`, not the app.
  - **Patients** choose Google or phone at `/invite/signup`, deliberately **not** Clerk — Clerk's
    Restricted mode is one on/off switch for the whole app; turning it off so patients (already
    gated by their invite *code*) could use it would also remove the only gate the dietitian
    side has, since nothing else backs that one up. Google uses a direct OAuth2 client
    (`lib/auth/googleOAuth.ts`, real ID-token verification, not Clerk); phone uses Twilio Verify
    (`lib/sms.ts`, a real texted-and-checked code, not the old "accepts whatever's submitted"
    mock — that mock, `lib/auth/verifyIdentity.ts`, is gone). Either path lands on
    `app/invite/details` to confirm name/age, then `POST /api/invite/finish` — which trusts
    *only* a short-lived signed cookie set by the Google callback or the OTP-check route
    (`lib/invitePendingIdentity.ts`), never anything the client claims about its own identity.
    Once redeemed, patients get the same session as always (`lib/auth/session.ts`, opaque
    token + httpOnly cookie) — unrelated to Clerk entirely, unaffected by which path they took.
  - **`mobile/`'s own signup screen still uses the old, unverified `{phone, firstName,
    lastName}` shape directly against `/api/invite/redeem`** (unchanged, kept for backward
    compatibility) — it hasn't been moved to real Google/OTP verification yet; that needs
    dedicated Expo-specific research (in-app browser / redirect patterns) before it's touched.
    Don't assume mobile phone signup is verified just because web's is now.
  - `proxy.ts` (Next 16's renamed, Node.js-runtime middleware) gates the dietitian console
    pages (`/`, `/patients/**`, `/team`) and every dietitian-exclusive API action against a
    linked Clerk identity, and separately requires a real patient session for `/me/**` — see
    its own comments for the full patient-safe-vs-gated classification. Web pages resolve
    *which* patient/dietitian from their respective session (`getSessionPatient()` in
    `lib/data.ts`, `getSessionDietitian()` in `lib/auth/dietitian.ts`), never a guess.
  - The shared `/api/patients/[id]/*` routes (called by both `/me/*` and `mobile/`) still
    don't verify a *patient* session belongs to that `:id` — a documented, accepted gap, since
    closing it means giving `mobile/` a real bearer token first (it has no cookie jar today;
    see `mobile/lib/session.ts`'s comments). There is deliberately **no public patient
    self-signup** — invite code first, always.
  - The demo dietitian's sign-in identity is whatever real Google/Microsoft email
    `DIETITIAN_BOOTSTRAP_EMAIL` is set to (see `.env`/deploy secrets) — `prisma/seed.ts` links
    that email to the seeded "Maria, RD" practice data on first Clerk sign-in. It has to be a
    real account Clerk can authenticate against, not a placeholder.
  - Dietitians can text an invite straight to a patient's phone from "Add patient" — optional,
    via Twilio (`lib/sms.ts`'s `sendInviteSms`, guarded the same way; no phone on file, or no
    Twilio configured, just falls back to today's copy-the-link-yourself experience).
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
