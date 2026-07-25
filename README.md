# Smart Savor

An adherence-and-outcomes tool for dietitians. *Your doctor tells your body what it needs — you
decide what's on your plate.*

**One fullstack Next.js app** — dietitian command center (`/rx/*`) + patient app (`/me/*`) + the API
(`/api/*` route handlers) — backed by PostgreSQL via Prisma. Single project: one `package.json`, one
`tsconfig`, one `node_modules`.

## Prerequisites
- Node 20+ and Docker (for Postgres — no local install needed).

## Quickstart
```bash
npm install                   # installs deps + generates the Prisma client
npm run db:up                 # start Postgres (Docker)
npm run db:migrate            # apply the schema
npm run db:seed               # seed patient Sam Rivera + Maria, RD
./scripts/ingest-grocery.sh   # load the 8,986-row Walmart×USDA reference table
npm run dev                   # http://localhost:3000  (also brings Postgres up)
```

## Routes

| Path | Who | Screen |
|---|---|---|
| `/` | — | Landing / portal picker |
| `/rx/prioritize` | Dietitian | D1.5 — ranked focus set |
| `/rx/ratify` | Dietitian | D2/D3 — comorbidity-screened swap menu |
| `/me/swap` ⭐ | Patient | THE USP — choose → recompute → still-approved |
| `/me/dashboard` | Patient | intake-toward-target gauges + weekly nudge |

## API (`/api/*`)
`GET /api/health` · `GET /api/patients` · `GET /api/patients/:id` ·
`GET /api/patients/:id/focus-set` · `POST /api/patients/:id/focus-set/confirm` ·
`GET /api/patients/:id/approved-lists/:nutrient` ·
`PATCH /api/patients/:id/approved-lists/:nutrient/items/:itemId` (approve/restore/remove/edit) ·
`POST /api/patients/:id/approved-lists/:nutrient/generate` (source new candidates from `grocery_items`) ·
`POST /api/patients/:id/choices` (the USP recompute). Try them via `requests.http`.

## Layout
- `app/` — pages + `app/api/` route handlers. Design system in `app/globals.css`
  (self-hosted Inter + Phosphor in `public/`, no CDN).
- `lib/` — `data.ts` (server Prisma access, used by pages **and** routes), `db.ts` (Prisma
  singleton), `recompute.ts` (the USP math, shared by server + client), `types.ts` (contract).
- `prisma/` — `schema.prisma` (mirrors `docs/Background/er-design.md`, plus `grocery_items` — see
  its in-schema comments for where the real dataset deviates from that doc), migrations, `seed.ts`.
- `scripts/ingest-grocery.sh` — loads `docs/Dataset/Grocery_Nutrition.csv` (8,986 rows) into
  `grocery_items` via `psql \copy`. Re-run anytime; it truncates first.

Pages call `lib/data` directly (server components, no HTTP hop); the interactive swap page calls
`/api` and shares `lib/recompute` for instant feedback.

## Deploy
Vercel (project root = repo root; it understands the Prisma `postinstall`), or containerized to the
capstone host. Point `DATABASE_URL` at a managed Postgres.

## Docs
`docs/Background/er-design.md` (data model), `docs/Background/architecture.md`,
`docs/6 deliverables/`. The custom MCP server lives in `smart-savor-mcp/` (Python; slated to become
its own repo).
