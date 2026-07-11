# Smart Savor — Frontend

Next.js (App Router) + TypeScript. The dietitian command center (`/rx/*`) and the patient app
(`/me/*`) from one codebase, sharing the ported "Premium Blue & White" design system.

**Phase 1 status:** fully clickable on a **seeded mock API** (patient Sam Rivera). No backend
required. Phase 3 swaps the mock for the FastAPI backend by editing one file — see below.

## Run locally

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

## Routes

| Path | Who | Screen |
|---|---|---|
| `/` | — | Landing / portal picker |
| `/rx/prioritize` | Dietitian | D1.5 — ranked focus set + confirm |
| `/rx/ratify` | Dietitian | D2/D3 — comorbidity-screened swap menu |
| `/me/swap` ⭐ | Patient | THE USP — choose → recompute → still-approved |
| `/me/dashboard` | Patient | Intake-toward-target gauges + weekly nudge |

## Architecture

- **Design system:** `app/globals.css` — ported verbatim from the prototype (shadcn/tweakcn
  tokens, self-hosted Inter in `public/fonts/`, Phosphor icons via CDN). All colors are CSS vars.
- **API seam:** `lib/api.ts` is the *only* place that knows data is mocked. Types in
  `lib/types.ts` mirror `docs/Background/er-design.md`, so the backend later fulfils the same
  contract. Seed data lives in `lib/mock.ts`.
- **USP recompute** (`chooseFood`) lives in `lib/api.ts` — in production this is Agent 4 / the
  backend; the swap page doesn't care whether it runs local or remote.

## Phase 3 — wiring the real backend

1. Add `NEXT_PUBLIC_API_BASE` to `.env.local`.
2. In `lib/api.ts`, replace each function body with a `fetch(`${API_BASE}/...`)` call returning
   the same types. No component changes.

## Deploy

Vercel (recommended for dev/preview — zero config, auto HTTPS) or containerized to the capstone
host `<student>.apps.human-angle.com`. GitHub Pages will **not** work — this app uses server
components/runtime features that Pages (static-only) can't serve.
