# Smart Savor — ER Design & Data Model Decisions

*2026-07-11 · Companion to `architecture.md` and `agents.md`. This document is the single source of truth for the Postgres schema — every table, every column, every decision. Written for the tech team to implement directly.*

---

## Part 0 — How to read this document

- **Decision boxes** explain WHY, not just what.
- Every table is listed with its full column set, types, and constraints.
- Status enums are listed exhaustively before the tables.
- The last section is the ASCII ER diagram.

---

## Part 1 — Tenancy & Auth

### Decision 1: Practice → Dietitian → Patient hierarchy

```
Practice ──< Dietitian ──< PatientDietitian >── Patient
```

- A **Practice** is the top-level tenant for v1 (e.g. "Metro Nutrition Clinic").
- A **Dietitian** belongs to one Practice; can move to another (reassigned, not deleted — old FK stays in history).
- A **Patient** is attached to a Practice, not a Dietitian. Why? Because when a dietitian leaves, the patient stays in the practice and gets reassigned.
- The **PatientDietitian** join table handles:
  - The primary dietitian (one at a time, `is_primary = true`)
  - Co-management (two dietitians, e.g. on complication, both rows active)
  - Historical assignments (soft-ended with `ended_at`)

### Decision 2: Auth — split by role (dietitian: custom; patient: Auth0) (updated 2026-08-08)

Two different auth mechanisms, one shared `users` table:
- **Dietitian** — `/login/dietitian` → dietitian command center (`/rx/*`). Custom, no third-party
  provider: email + password, our own session.
- **Patient** — `/me/*`. **Auth0** (Google OAuth or phone/SMS OTP) gates identity; a valid,
  unredeemed invite code (Decision 3) gates *whether Auth0 even runs* — Auth0 gets invoked only
  after the code checks out, so "invite-only" still holds even though a third party now handles
  the patient's actual sign-in.

**Why the split:** dietitian accounts are few, practice-provisioned, and password auth is fine
there. Patient accounts are the volume side and benefit from Auth0's passwordless SMS OTP + Google
federation — building and maintaining that ourselves (SMS delivery, OTP rate-limiting, Google OAuth
handshake) isn't where this project's effort should go. This reverses the earlier "no third-party
auth provider" stance for patients specifically; dietitian auth is unchanged.

**How it works:** a single `users` table stores identity and maps to either a `dietitians` row or a
`patients` row via `role` + a nullable FK pair, same as before. The app never lets a dietitian token
reach a patient endpoint and vice versa — the `role` column is the gate. Dietitian rows carry a
`password_hash`; patient rows carry an `auth0_user_id` (the Auth0 `sub` claim) instead — never both.

**Session strategy (dietitian):** server-side sessions in Redis (keyed by `session_token`), with a
`sessions` table in Postgres as a durable fallback. httpOnly cookie, simpler to revoke than JWT.

**Session strategy (patient):** Auth0 handles the actual authentication; on successful callback our
backend verifies the ID token, upserts the `users` row, and issues our own httpOnly-cookie session
(same shape as the dietitian session) so every downstream `/api/*` check stays uniform regardless of
which auth mechanism originally established identity.

**Password storage (dietitian only):** `bcrypt` hash (cost factor 12). Never store plaintext.

**`users` table:**

```sql
users
├── id                UUID PK DEFAULT gen_random_uuid()
├── email             VARCHAR(255) UNIQUE               -- nullable: phone-only patient signups may not have one
├── phone             VARCHAR(20) UNIQUE                -- patients who verified via SMS OTP
├── password_hash     VARCHAR(255)                      -- bcrypt, cost 12 — dietitians only
├── auth0_user_id     VARCHAR(255) UNIQUE               -- Auth0 `sub` claim — patients only
├── role              VARCHAR(20) NOT NULL              -- 'dietitian' | 'patient'
├── dietitian_id      UUID UNIQUE REFERENCES dietitians(id)  -- non-null when role='dietitian'
├── patient_id        UUID UNIQUE REFERENCES patients(id)    -- non-null when role='patient'
├── is_active         BOOLEAN NOT NULL DEFAULT true     -- false = account suspended
├── last_login_at     TIMESTAMPTZ
├── password_reset_token        VARCHAR(255)             -- dietitians only
├── password_reset_token_expiry TIMESTAMPTZ
├── created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()

CHECK (
  (role = 'dietitian' AND dietitian_id IS NOT NULL AND patient_id IS NULL AND password_hash IS NOT NULL) OR
  (role = 'patient'   AND patient_id IS NOT NULL   AND dietitian_id IS NULL AND auth0_user_id IS NOT NULL)
)
```

**Auth flow (dietitian):**
1. `POST /api/auth/dietitian/login` → validate email + password → create session → return httpOnly cookie
2. Every `/rx/*` request → middleware reads cookie → resolves `user.dietitian_id` → injects `dietitian` into request context
3. `POST /api/auth/dietitian/logout` → invalidate session

**Auth flow (patient):** see Decision 3 — gated by invite-code validation first, then Auth0.

**Remove from other tables:** `clerk_user_id` columns are gone. `practices.clerk_org_id` is gone.

### Decision 3: Patient onboarding — invite-code gated, Auth0 for sign-up (updated 2026-08-08)

**No public patient self-signup.** A patient can only ever reach the Auth0 sign-up step by first
redeeming a one-time invite code their dietitian issued. The earlier "regular use" option (patient
self-serve sign-up, no dietitian relationship required first) is **scrapped** — every patient in the
system traces back to a dietitian who added them. Dietitian accounts are unaffected: they're
provisioned normally (Decision 2), not via invite code or Auth0.

**`patient_invites` table:**

```sql
patient_invites
├── id            UUID PK DEFAULT gen_random_uuid()
├── patient_id    UUID UNIQUE NOT NULL REFERENCES patients(id)  -- one live invite per patient
├── code          VARCHAR(32) UNIQUE NOT NULL       -- random, URL-safe; what the dietitian shares
├── issued_by     UUID NOT NULL REFERENCES dietitians(id)
├── expires_at    TIMESTAMPTZ NOT NULL              -- short-lived (e.g. 14 days)
├── redeemed_at   TIMESTAMPTZ                       -- null until used; one-time
└── created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Flow:**
1. Dietitian creates the patient record (D5 intake / manual add in `/rx`) → the system generates a
   `patient_invites` row + code in the same step.
2. Dietitian hands the patient the code (printed after-visit summary today; optional Resend email
   later — no new channel required for v1).
3. Patient opens the app → splash → **enters the invite code** at `/invite` → validate
   **unexpired, unredeemed** against `patient_invites`. Wrong/expired code stops here — Auth0 never
   runs.
4. Code checks out → **sign up via Auth0**: either
   - **Google** (federated) — Auth0 returns name + email from the Google profile automatically, or
   - **Mobile number** — patient enters first + last name (no email, no age) + phone → Auth0 sends
     an SMS OTP → patient verifies it.
5. On successful Auth0 callback, backend verifies the ID token and creates the `users` row
   (`role='patient'`, `auth0_user_id`, `patient_id` from the invite, `email`/`phone` from whichever
   method was used) → stamps `patient_invites.redeemed_at`.
6. From then on the patient authenticates via Auth0 directly at `/login/patient` — no invite code
   needed on return visits, same as any normal login.

A reissue (lost/expired code) just generates a new code for the same `patient_id` — the `UNIQUE`
constraint on `patient_id` means the dietitian's "resend invite" action overwrites the row rather
than accumulating stale ones.

---

## Part 2 — Status Enums (exhaustive)

Define these as Postgres enum types or VARCHAR with a CHECK constraint.

### `cycle_status`
| Value | Meaning | Who/what sets it |
|---|---|---|
| `pending_prioritization` | Patient enrolled, no focus set yet | System on enrollment |
| `active` | Focus set confirmed, plan running (weeks 1–12) | After dietitian confirms focus set |
| `lab_due` | Within 2 weeks of `retest_due_date` | Scheduled job (can just be a view) |
| `outcome_pending` | Retest lab uploaded, Outcome Analyst not yet run | System when retest lab arrives |
| `completed` | Outcome computed, cycle closed | Dietitian or system after outcome |
| `abandoned` | Patient dropped out or dietitian closed early | Dietitian manual action |

### `focus_item_outcome_status`
| Value | Meaning |
|---|---|
| `in_progress` | Gap still being worked on this cycle |
| `closed` | Target met — graduated |
| `carried_forward` | Not closed — dietitian chose to continue in next cycle |
| `deferred` | Dietitian removed from next cycle |

### `approved_list_status`
| Value | Meaning |
|---|---|
| `draft` | Agent 4 output — not yet seen by dietitian |
| `ratified` | Dietitian approved (may have edits/removals) |

### `consultation_source` (for consumption events)
| Value | Confidence tier | Notes |
|---|---|---|
| `photo` | 1 (highest) | Claude vision reads food photo |
| `voice` | 2 | Transcribed voice log |
| `text` | 3 | Manual text log from patient |
| `nudge_confirmed` | 4 | Patient replied "yes" to nudge |
| `inferred` | 5 (lowest) | Inferred from receipt, not confirmed |

### `lab_kind`
| Value | Notes |
|---|---|
| `baseline` | Pre-enrollment or start-of-cycle (clinician uploads) |
| `retest` | 3-month outcome retest |
| `midcycle` | Spot test mid-cycle (recorded, doesn't affect outcome) |

### `analyte_flag`
`High | Low | Normal | Critical | Alert | null`

### `rule_severity` (contraindication rules)
| Value | Notes |
|---|---|
| `hard_exclude` | Agent 4 must drop the food from the approved list |
| `soft_flag` | Agent 4 keeps the food but sets `comorbidity_flag`; dietitian decides |

### `nudge_response`
`yes | no | null` (null = no reply received)

---

## Part 3 — Full Table Specifications

---

### 3.1 `practices`

```sql
practices
├── id               UUID PK DEFAULT gen_random_uuid()
├── name             VARCHAR(255) NOT NULL
├── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.2 `dietitians`

```sql
dietitians
├── id               UUID PK DEFAULT gen_random_uuid()
├── practice_id      UUID NOT NULL REFERENCES practices(id)
├── name             VARCHAR(255) NOT NULL
├── credential       VARCHAR(100)                   -- "RD", "RDN", "CDN"
├── email            VARCHAR(255) NOT NULL          -- denormalized from users.email for display
├── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Decision:** `practice_id` points to current practice. If a dietitian moves practices, update `practice_id` — no history needed at v1. Old patient assignments via `patient_dietitians` (below) remain unaffected.

**Note:** `email` is denormalized here for display (e.g. "ratified by maria@clinic.com"). The canonical auth email lives in `users.email`. Keep them in sync on email-change flows.

---

### 3.3 `patients`

```sql
patients
├── id                    UUID PK DEFAULT gen_random_uuid()
├── practice_id           UUID NOT NULL REFERENCES practices(id)
├── name                  VARCHAR(255)
├── date_of_birth         DATE
├── age                   SMALLINT                       -- denormalized for fast display; recompute on intake update
├── gender                VARCHAR(50)
├── blood_group           VARCHAR(10)
├── bmi                   NUMERIC(5,2)
├── bp_systolic           SMALLINT
├── bp_diastolic          SMALLINT
├── conditions            TEXT[]                         -- e.g. ["type-2 diabetes", "cardiac risk"]
├── restrictions          TEXT[]                         -- dietary: ["vegetarian"]
├── dislikes              TEXT[]                         -- food dislikes: ["mushrooms"]
├── weekly_budget_usd     NUMERIC(8,2)
├── report_meta           JSONB                          -- {date_collected, fasting, ordering_physician, performing_lab}
├── enrolled_at           TIMESTAMPTZ                    -- when their first cycle starts
├── created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Decision — `conditions` as TEXT[]:** We use a simple array for v1 because the contraindication rules engine keys on condition strings (e.g. `"type-2 diabetes"`), not IDs. If a conditions master table is needed later, migrate then.

**Decision — `restrictions`/`dislikes` as TEXT[]:** Same rationale. The food-sourcing agent reads these as a simple list.

**Decision — `report_meta` as JSONB:** This is metadata from the lab report header (ordering physician, performing lab, etc.). It changes rarely, doesn't need to be indexed, and the structure is stable. JSONB is appropriate here.

---

### 3.4 `patient_dietitians` (join table)

**Handles:** primary assignment, co-management, and historical reassignment.

```sql
patient_dietitians
├── id               UUID PK DEFAULT gen_random_uuid()
├── patient_id       UUID NOT NULL REFERENCES patients(id)
├── dietitian_id     UUID NOT NULL REFERENCES dietitians(id)
├── is_primary       BOOLEAN NOT NULL DEFAULT true
├── started_at       TIMESTAMPTZ NOT NULL DEFAULT now()
├── ended_at         TIMESTAMPTZ                        -- NULL = currently active
├── reason           TEXT                               -- "practice transfer", "complication co-management"
└── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (patient_id, dietitian_id, started_at)
```

**Rules enforced at application layer:**
- Exactly one row per patient with `is_primary = true AND ended_at IS NULL` at any time.
- A second dietitian can be added as co-manager (`is_primary = false, ended_at = null`).
- Reassignment = close the current primary row (`ended_at = now()`) + insert new primary row.

---

### 3.5 `nutrient_gaps`

**Decision on Gap Entity (Q7):** A gap is its own table row — NOT a string repeated everywhere. This allows approved lists, focus set items, outcomes, and patient choices to all FK into the same gap record, giving full traceability.

**Decision on Q8 (carry-forwards):** The dietitian explicitly chooses whether a gap appears in the next cycle. There is no auto-carry. The next cycle's focus set is drafted by Agent 3 from the patient's full gap list, which includes any gaps where `current_value < target_value` regardless of prior cycles. The agent then presents all options; the dietitian confirms.

```sql
nutrient_gaps
├── id               UUID PK DEFAULT gen_random_uuid()
├── patient_id       UUID NOT NULL REFERENCES patients(id)
├── nutrient         VARCHAR(50) NOT NULL               -- "iron", "vitamin_c", "magnesium" etc.
├── current_value    NUMERIC(10,4) NOT NULL
├── target_value     NUMERIC(10,4) NOT NULL
├── unit             VARCHAR(20) NOT NULL               -- "mg", "g", "IU", "ug"
├── severity         VARCHAR(20) NOT NULL               -- "severe", "moderate", "mild"
├── source_lab_id    UUID REFERENCES lab_reports(id)   -- which lab set this gap (nullable for manual entry)
├── set_by           UUID NOT NULL REFERENCES dietitians(id) -- clinician who flagged this gap
├── is_active        BOOLEAN NOT NULL DEFAULT true      -- false = gap resolved / closed across all cycles
├── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (patient_id, nutrient)  -- one active gap per nutrient per patient
```

**Supported nutrients (the 12 actionable ones from reference.py):**
`iron | vitamin_c | magnesium | calcium | potassium | zinc | fiber | protein | folate | vitamin_d | vitamin_b12 | sodium`

---

### 3.6 `cycles`

**Decision on Q4 (cycle start):** Cycle starts when the patient is enrolled (dietitian action). `enrolled_at` on the patient is set then; `cycles.start_date = enrolled_at`.

**Decision on Q5 (status):** See the `cycle_status` enum in Part 2.

**Decision on Q6 (mid-cycle revision):** The focus set can be revised mid-cycle. We handle this by giving each `focus_set_items` row a `version` counter and keeping all versions. The UI always shows the latest version. See `focus_set_items` below.

```sql
cycles
├── id                  UUID PK DEFAULT gen_random_uuid()
├── patient_id          UUID NOT NULL REFERENCES patients(id)
├── cycle_slug          VARCHAR(50)                      -- e.g. "sam-2026q2" (human-readable, non-PK)
├── start_date          DATE NOT NULL
├── retest_due_date     DATE NOT NULL                    -- start_date + 90 days
├── status              cycle_status NOT NULL DEFAULT 'pending_prioritization'
├── baseline_lab_id     UUID REFERENCES lab_reports(id) -- the pre-cycle lab
├── retest_lab_id       UUID REFERENCES lab_reports(id) -- the 3-month re-test lab
├── previous_cycle_id   UUID REFERENCES cycles(id)      -- linked list of cycles per patient
├── focus_set_version   SMALLINT NOT NULL DEFAULT 0     -- increments on each dietitian revision
├── created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.7 `focus_set_items`

**Decision on Q6 (mid-cycle revision history):** Each revision by the dietitian bumps `cycle.focus_set_version` and inserts new `focus_set_items` rows with the new version. The previous version rows are kept. The "current focus set" is always `WHERE cycle_id = ? AND version = (SELECT focus_set_version FROM cycles WHERE id = ?)`.

```sql
focus_set_items
├── id               UUID PK DEFAULT gen_random_uuid()
├── cycle_id         UUID NOT NULL REFERENCES cycles(id)
├── nutrient_gap_id  UUID NOT NULL REFERENCES nutrient_gaps(id)
├── version          SMALLINT NOT NULL DEFAULT 0        -- matches cycle.focus_set_version at insert time
├── rank             SMALLINT NOT NULL                  -- 1-based, within this version
├── why              TEXT NOT NULL                      -- Agent 3's one-line rationale
├── pair_with        VARCHAR(50)                        -- synergy partner nutrient, e.g. "vitamin_c"
├── conflicts_with   VARCHAR(50)                        -- conflict partner nutrient, e.g. "calcium"
├── priority_score   NUMERIC(6,2)                       -- Agent 3's computed score (severity×10 + condition bonus etc.)
├── outcome_status   focus_item_outcome_status NOT NULL DEFAULT 'in_progress'
└── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.8 `lab_reports`

**Decision on Q21 (mid-cycle tests):** Mid-cycle spot tests are supported via `kind = 'midcycle'`. The dashboard shows the 90-day baseline→retest delta. Mid-cycle labs are recorded and visible but don't affect the outcome computation (only `baseline` and `retest` are used in `cycle_outcomes`).

**Decision on Q21 (who uploads):** The dietitian uploads labs in v1. The patient can upload in a future version.

```sql
lab_reports
├── id                  UUID PK DEFAULT gen_random_uuid()
├── patient_id          UUID NOT NULL REFERENCES patients(id)
├── uploaded_by         UUID NOT NULL REFERENCES dietitians(id)
├── kind                lab_kind NOT NULL               -- baseline | retest | midcycle
├── date_collected      DATE
├── date_received       DATE
├── fasting             VARCHAR(20)                     -- "Yes" | "No" | "Not Given"
├── ordering_physician  VARCHAR(255)
├── performing_lab      VARCHAR(255)
├── report_status       VARCHAR(50)                     -- "final" | "preliminary" | "corrected"
├── overall_status      VARCHAR(50)                     -- "parsed" | "insufficient_data"
├── s3_key              VARCHAR(1000)                   -- path to original PDF/image in S3
├── created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.9 `lab_analytes`

**Decision on Q20 (JSONB vs normalized):** Normalized rows — one row per analyte per lab report. Reasons:
1. We need to query by analyte name across reports (e.g. "show me all HbA1c readings for Sam").
2. We need to JOIN `lab_analytes` to `nutrient_gaps` and `cycle_outcomes` by nutrient name.
3. Lab panels vary from 5 to 40 analytes — JSONB would make these queries painful.
4. A typical patient will have ~15 product-relevant analytes + ~20 other analytes per lab = ~35 rows per report. That's trivially small for Postgres.

```sql
lab_analytes
├── id                  UUID PK DEFAULT gen_random_uuid()
├── lab_report_id       UUID NOT NULL REFERENCES lab_reports(id)
├── panel               VARCHAR(100)                   -- "Glycemic", "Lipid Panel", "Minerals", etc.
├── name                VARCHAR(100) NOT NULL           -- "HbA1c", "LDL Cholesterol", "Iron"
├── value               NUMERIC(12,4)
├── unit                VARCHAR(30)                     -- "%", "mg/dL", "ng/mL"
├── reference_text      VARCHAR(100)                   -- raw from report: "4.0-5.6", "<100", ">40"
├── reference_low       NUMERIC(12,4)                  -- parsed from reference_text
├── reference_high      NUMERIC(12,4)                  -- parsed from reference_text
├── flag                analyte_flag                    -- High | Low | Normal | Critical | Alert | null
├── prior_value         NUMERIC(12,4)                  -- previous reading (from the report's "previous" column)
├── prior_date          DATE                           -- date of the prior reading
├── confidence          NUMERIC(4,3)                   -- 0.0–1.0, from Agent 1's extraction
├── needs_review        BOOLEAN NOT NULL DEFAULT false -- Agent 1 flagged: human should verify
├── is_product_relevant BOOLEAN NOT NULL DEFAULT false -- routes to lab_results vs other_analytes panel
└── created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Product-relevant filter keywords** (from `intake_agent.py`): HbA1c, glucose, LDL, HDL, triglycerides, iron, ferritin, vitamin D, vitamin B12, folate, magnesium, calcium, potassium, sodium.

---

### 3.10 `approved_lists`

**Decision on Q9 (approved list granularity):** One `approved_list` per `(patient_id, nutrient_gap_id)` — the LATEST ratified list is the live one. We do not create a new approved list per cycle because the list represents the dietitian's standing view of safe swaps for a given gap. If the dietitian revises mid-cycle, they update the items in the same list (old items get `removed_at`). The `updated_at` timestamp tracks recency.

**Why not per-cycle?** The approved list outlasts cycles if the gap carries forward. Creating a new list per cycle would duplicate all items unnecessarily.

```sql
approved_lists
├── id               UUID PK DEFAULT gen_random_uuid()
├── patient_id       UUID NOT NULL REFERENCES patients(id)
├── nutrient_gap_id  UUID NOT NULL REFERENCES nutrient_gaps(id)
├── status           approved_list_status NOT NULL DEFAULT 'draft'
├── drafted_by_cycle UUID REFERENCES cycles(id)         -- which cycle triggered this draft
├── ratified_by      UUID REFERENCES dietitians(id)     -- who ratified it
├── ratified_at      TIMESTAMPTZ
├── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (patient_id, nutrient_gap_id)
```

---

### 3.11 `approved_list_items`

**Decision on Q10 (comorbidity_flag):** `comorbidity_flag` is a nullable `TEXT` column on each item — the flag is the human-readable reason the agent generated (e.g. `"type-2 diabetes: high-sugar caution"`). If it's null, the item is clean. If it's non-null, the dietitian sees it and decides whether to keep or remove the item. There is no separate flag table — the text IS the flag.

**Decision on Q10 (food as FK vs string):** Food is stored as `food_name VARCHAR(255)` + `fdc_id VARCHAR(50)`. We do NOT require a FK to a `grocery_items` table because:
- Agent 4 may source foods from USDA FDC directly (not just from the Walmart-matched reference table).
- The `fdc_id` is the join key; lookup into `grocery_items` is done at query time, not enforced by FK.
- If `fdc_id` is null, the item was sourced from a food database without a Walmart price match.

**Decision on removed items:** Items removed by the dietitian during ratification get `removed_at` set (soft delete). They are excluded from the patient-facing view but kept for audit.

```sql
approved_list_items
├── id                      UUID PK DEFAULT gen_random_uuid()
├── approved_list_id        UUID NOT NULL REFERENCES approved_lists(id)
├── food_name               VARCHAR(255) NOT NULL
├── fdc_id                  VARCHAR(50)                -- nullable: USDA FDC ID
├── serving_description     VARCHAR(100)               -- "1 cup", "1 oz"
├── serving_size_g          NUMERIC(8,2)               -- grams per serving (from grocery_items)
├── amount_per_serving      NUMERIC(10,4) NOT NULL     -- nutrient quantity per serving in `unit`
├── unit                    VARCHAR(20) NOT NULL        -- "mg", "g", "IU", "ug"
├── servings_to_close       SMALLINT NOT NULL          -- ceil(gap_size / amount_per_serving)
├── price_per_serving_usd   NUMERIC(8,4)               -- nullable (not always available)
├── disruption_score        NUMERIC(4,3)               -- 0.0–1.0 (0 = near habits, 1 = novel)
├── comorbidity_flag        TEXT                       -- null = clean; non-null = agent flagged this
├── why                     TEXT NOT NULL              -- agent's human-readable rationale
├── rank                    SMALLINT NOT NULL          -- display order (1 = best)
├── removed_at              TIMESTAMPTZ                -- soft delete when dietitian removes
├── removed_by              UUID REFERENCES dietitians(id)
└── created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.12 `patient_choices` (the USP record)

**Decision on Q11 (choice history):** A patient can change their food choice between weeks. Each change creates a NEW row (insert-only). The "current" choice is the latest row for a given `(patient_id, cycle_id, nutrient_gap_id)`. Old choices are preserved for adherence analysis.

**Decision on Q12 (amount storage):** `servings_per_week` IS stored in the DB row. Rationale: the recomputed amount depends on `amount_per_serving` at the time of choice. If the reference data changes later (price refresh), the stored value is what was valid when the patient chose. Always store derived values when they represent a decision, not a current calculation.

```sql
patient_choices
├── id                   UUID PK DEFAULT gen_random_uuid()
├── patient_id           UUID NOT NULL REFERENCES patients(id)
├── cycle_id             UUID NOT NULL REFERENCES cycles(id)
├── nutrient_gap_id      UUID NOT NULL REFERENCES nutrient_gaps(id)
├── approved_list_item_id UUID NOT NULL REFERENCES approved_list_items(id)
├── food_name            VARCHAR(255) NOT NULL          -- denormalized for readability
├── serving_description  VARCHAR(100) NOT NULL
├── amount_per_serving   NUMERIC(10,4) NOT NULL
├── unit                 VARCHAR(20) NOT NULL
├── servings_per_week    SMALLINT NOT NULL              -- ceil(gap_target / amount_per_serving)
├── gap_target           NUMERIC(10,4) NOT NULL         -- the gap_size at time of choice
├── gap_closed_pct       NUMERIC(5,2)                  -- % of gap closed (typically 100%)
├── still_approved       BOOLEAN NOT NULL DEFAULT true  -- always true; the validation gate prevents false
├── chosen_at            TIMESTAMPTZ NOT NULL DEFAULT now()
└── superseded_at        TIMESTAMPTZ                   -- set when patient changes their choice
```

---

### 3.13 `receipts`

**Decision on Q14 (receipt entity):** Yes, `receipts` is a first-class table. The habit model is derived FROM receipt line items, not stored directly. The raw receipt entity is needed for:
- S3 image reference (so the dietitian can see what was uploaded)
- Parse status tracking
- The set-difference query (purchases − consumption) uses receipt-sourced purchase events

```sql
receipts
├── id               UUID PK DEFAULT gen_random_uuid()
├── patient_id       UUID NOT NULL REFERENCES patients(id)
├── upload_date      TIMESTAMPTZ NOT NULL DEFAULT now()
├── purchased_at     DATE                              -- date on the receipt (may differ from upload)
├── retailer         VARCHAR(255)                      -- "Walmart", "Kroger", etc. (extracted by Agent 2)
├── s3_key           VARCHAR(1000) NOT NULL            -- path to original image/PDF
├── parse_status     VARCHAR(50) NOT NULL DEFAULT 'pending'  -- pending | parsed | failed | needs_review
├── agent_run_id     VARCHAR(255)                      -- Langfuse trace ID for Agent 2's run
├── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.14 `receipt_line_items`

```sql
receipt_line_items
├── id               UUID PK DEFAULT gen_random_uuid()
├── receipt_id       UUID NOT NULL REFERENCES receipts(id)
├── raw_text         VARCHAR(500) NOT NULL              -- original text on receipt
├── matched_food     VARCHAR(255)                      -- resolved food name (Skill A output)
├── fdc_id           VARCHAR(50)                       -- USDA FDC ID (Skill A output)
├── quantity         NUMERIC(8,2)                      -- number of units purchased
├── price_usd        NUMERIC(8,2)
├── match_confidence NUMERIC(4,3)                      -- 0.0–1.0 from Skill A
├── match_flag       VARCHAR(50)                       -- "ok" | "needs_review" | "ambiguous" | "no_match"
└── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.15 `habit_model` (materialized purchase signal)

**Decision on Q13 (habit model shape):** We use BOTH:
1. `receipt_line_items` = raw events (normalized, queryable, traceable).
2. `habit_model` = aggregated purchase frequency table (rolled up per food per patient).

The aggregated table is what Agent 3 and Agent 5 read for fast lookups (`get_habit_model`). It is updated by Agent 2 after each receipt is processed — not a Postgres materialized view, because the update needs Agent 2's logic (de-dup, frequency roll-up).

```sql
habit_model
├── id               UUID PK DEFAULT gen_random_uuid()
├── patient_id       UUID NOT NULL REFERENCES patients(id)
├── food_name        VARCHAR(255) NOT NULL
├── fdc_id           VARCHAR(50)
├── freq_per_week    NUMERIC(6,3) NOT NULL              -- rolling weekly frequency estimate
├── last_seen_date   DATE NOT NULL
├── source           VARCHAR(50) NOT NULL DEFAULT 'receipt'  -- "receipt" | "manual" | "none"
├── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (patient_id, food_name)
```

---

### 3.16 `consumption_events`

**Decision on Q15 (source enum):** The `source` column uses the `consultation_source` enum defined in Part 2. `nudge_confirmed` = patient replied yes to a nudge (links to `nudges.id`). `inferred` = Agent 2 concluded consumption from a receipt when no log exists — lowest confidence, never used for the clinical dashboard.

**Decision on Q16 (confidence):** `confidence_tier` is a SMALLINT from 1–5 (1=photo, highest; 5=inferred, lowest). This is simpler than a float for the ranked comparison the dashboard needs. The dashboard only shows events with `confidence_tier <= 4` (i.e. excludes `inferred`).

**Decision on Q18 (nudge FK):** Yes — `source_nudge_id UUID REFERENCES nudges(id)` is included. Null for all non-nudge sources. This gives Agent 5 clean traceability and makes adherence attribution queryable.

```sql
consumption_events
├── id                  UUID PK DEFAULT gen_random_uuid()
├── patient_id          UUID NOT NULL REFERENCES patients(id)
├── food_name           VARCHAR(255) NOT NULL
├── fdc_id              VARCHAR(50)
├── raw_input           TEXT                            -- original photo/voice/text log from patient
├── consumed_date       DATE NOT NULL
├── source              consultation_source NOT NULL
├── confidence_tier     SMALLINT NOT NULL               -- 1=photo, 2=voice, 3=text, 4=nudge_confirmed, 5=inferred
├── match_confidence    NUMERIC(4,3)                    -- Skill A match score 0.0–1.0
├── flag                VARCHAR(50) NOT NULL DEFAULT 'ok'  -- "ok" | "needs_review"
├── source_nudge_id     UUID REFERENCES nudges(id)      -- non-null only when source='nudge_confirmed'
├── source_receipt_id   UUID REFERENCES receipts(id)    -- non-null only when source='inferred'
├── created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.17 `nudges`

**Decision on Q17 (weekly cadence guard):** Enforced by the application (Agent 5 query: `WHERE patient_id = ? AND sent_at > now() - INTERVAL '7 days'` before inserting). The `UNIQUE (patient_id, food_name, week_number)` constraint is a DB-level safety net. `week_number = DATE_TRUNC('week', sent_at)`.

**Note:** Using `DATE_TRUNC('week', ...)` is simpler than a "7 days from last nudge" window and avoids drift.

**Decision on Q19 (response options):** `nudge_response` enum: `yes | no | null`. Free-text replies are NOT stored in v1 — too complex to process. A "yes" triggers `record_nudge_response` which writes a `consumption_event` with `source='nudge_confirmed'`. A "no" just sets `response = 'no'` with no consumption event.

```sql
nudges
├── id               UUID PK DEFAULT gen_random_uuid()
├── patient_id       UUID NOT NULL REFERENCES patients(id)
├── cycle_id         UUID NOT NULL REFERENCES cycles(id)
├── nutrient_gap_id  UUID NOT NULL REFERENCES nutrient_gaps(id)
├── food_name        VARCHAR(255) NOT NULL               -- the specific food the nudge references
├── message          TEXT NOT NULL                      -- full nudge message text (personalized by Agent 5)
├── sent_at          TIMESTAMPTZ NOT NULL DEFAULT now()
├── week_number      DATE NOT NULL                      -- DATE_TRUNC('week', sent_at) for cadence guard
├── response         nudge_response DEFAULT NULL        -- yes | no | null
├── responded_at     TIMESTAMPTZ
└── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (patient_id, food_name, week_number)  -- one nudge per food per patient per week
```

---

### 3.18 `cycle_outcomes`

**Decision on Q22 (adherence_score):** `adherence_classification` is a VARCHAR enum: `adherent | partial | non_adherent`. Computed by the Outcome Analyst agent (post-MVP) from the ratio of confirmed consumption events of gap-relevant foods vs. expected (based on `patient_choices.servings_per_week`). For v1, it can be a simple code computation: `>= 70% of target servings confirmed → adherent`, `40–70% → partial`, `< 40% → non_adherent`.

```sql
cycle_outcomes
├── id                       UUID PK DEFAULT gen_random_uuid()
├── cycle_id                 UUID NOT NULL REFERENCES cycles(id)
├── focus_set_item_id        UUID NOT NULL REFERENCES focus_set_items(id)
├── nutrient_gap_id          UUID NOT NULL REFERENCES nutrient_gaps(id)
├── baseline_value           NUMERIC(12,4) NOT NULL
├── retest_value             NUMERIC(12,4)               -- null if retest lab not yet uploaded
├── delta                    NUMERIC(12,4)               -- retest - baseline (positive = improvement)
├── improved                 BOOLEAN                     -- null until retest received
├── outcome_status           focus_item_outcome_status NOT NULL DEFAULT 'in_progress'
├── adherence_pct            NUMERIC(5,2)                -- % of expected servings confirmed (0–100)
├── adherence_classification VARCHAR(20)                 -- adherent | partial | non_adherent
├── computed_at              TIMESTAMPTZ                 -- when the Outcome Analyst ran
└── created_at               TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (cycle_id, nutrient_gap_id)
```

---

### 3.19 `contraindication_rules`

**Decision on Q23 (rule granularity):** Rules can target either a nutrient OR a specific food — both are supported. The `target_type` column disambiguates. Examples:
- `condition="cardiac risk", target_type="nutrient", target_value="potassium", severity="soft_flag"` → potassium-rich foods flagged for cardiac patients
- `condition="anticoagulant use", target_type="food", target_value="grapefruit", severity="hard_exclude"` → grapefruit always excluded

**Decision on Q24 (ownership):** Rules are **global** — shared across all practices for v1. The Comorbidity-Rules Curator dev subagent seeds and maintains them. Dietitians cannot edit them directly (they ratify the output but don't edit the rules table). If a practice needs a custom override in the future, add a `practice_id` FK (nullable — null = global).

**Decision on Q25 (versioning):** No full audit trail for v1. Rules get `updated_at` and `updated_by`. If a rule is wrong, the curator fixes it and future agent runs use the new version. Old approved lists already generated are NOT retroactively changed — they were correct at the time of drafting. (A future `rule_version_id` FK on `approved_list_items` could be added if audit trail becomes a requirement.)

```sql
contraindication_rules
├── id                   UUID PK DEFAULT gen_random_uuid()
├── condition            VARCHAR(100) NOT NULL           -- "type-2 diabetes", "cardiac risk", "CKD"
├── target_type          VARCHAR(20) NOT NULL            -- "nutrient" | "food"
├── target_value         VARCHAR(100) NOT NULL           -- nutrient name OR food name
├── severity             rule_severity NOT NULL          -- hard_exclude | soft_flag
├── reason               TEXT NOT NULL                  -- human-readable explanation shown to dietitian
├── evidence_source      VARCHAR(255)                   -- e.g. "ADA 2024 guidelines §8.2"
├── is_active            BOOLEAN NOT NULL DEFAULT true
├── created_by           UUID REFERENCES dietitians(id) -- null if seeded by curator
├── updated_by           UUID REFERENCES dietitians(id)
├── created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
└── updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.20 `grocery_items` (the reference table — Walmart × USDA join)

**Decision on Q26 (food master vs. FDC calls):** We maintain a local `grocery_items` table seeded from the pre-computed CSV (8,986 rows). Reasons:
- The gap-efficiency query (`query_nutrient_sources`) joins price × nutrient → must be fast. Runtime MCP calls to USDA FDC are too slow for this.
- The join is done offline by the Join-Pipeline Builder subagent; production just reads the result.
- Approved list items carry `fdc_id` as a string FK — it resolves to `grocery_items.fdc_id` at query time (no DB FK constraint because not all FDC IDs are in the Walmart dataset).

**Decision on Q28 (price refresh):** Static for v1 — `price_snapshot_date` records when the data was sourced. In a future version, a price-refresh pipeline updates rows and bumps `price_snapshot_date`. Approved list items store `price_per_serving_usd` at the time of drafting (snapshot), so old lists are unaffected by price refresh.

**Nutrient columns stored per-100g:** the 12 actionable nutrients from `reference.py`. Per-serving amounts are computed at query time: `amount_per_serving = per_100g × serving_size_g / 100`.

```sql
grocery_items
├── id                   UUID PK DEFAULT gen_random_uuid()
├── fdc_id               VARCHAR(50) UNIQUE NOT NULL     -- USDA FDC ID — the join key
├── product_name         VARCHAR(500) NOT NULL
├── brand                VARCHAR(255)
├── department           VARCHAR(100)                   -- "Produce", "Dairy", "Meat/Seafood", "Frozen"
├── category             VARCHAR(100)                   -- "Sliced Bread", "Canned Vegetables"
├── price_usd            NUMERIC(8,4)
├── package_size         VARCHAR(100)                   -- "20.0 oz"
├── price_per_100g_usd   NUMERIC(10,6)
├── usda_description     VARCHAR(500)
├── usda_source          VARCHAR(100)                   -- "USDA Branded", "Survey (FNDDS)"
├── match_confidence     VARCHAR(20)                    -- "high" | "medium" — Food Matcher quality
├── serving_size_g       NUMERIC(8,3)
├── household_serving    VARCHAR(100)                   -- "1 SLICE", "1 cup"
├── calories_kcal        NUMERIC(8,2)
├── protein_g            NUMERIC(8,4)
├── total_fat_g          NUMERIC(8,4)
├── fiber_g              NUMERIC(8,4)
├── sugars_g             NUMERIC(8,4)
├── added_sugars_g       NUMERIC(8,4)
├── sodium_mg            NUMERIC(8,4)
├── potassium_mg         NUMERIC(8,4)
├── calcium_mg           NUMERIC(8,4)
├── iron_mg              NUMERIC(8,4)
├── magnesium_mg         NUMERIC(8,4)
├── zinc_mg              NUMERIC(8,4)
├── vitamin_c_mg         NUMERIC(8,4)
├── vitamin_d_iu         NUMERIC(8,4)
├── vitamin_a_rae_ug     NUMERIC(8,4)
├── vitamin_b12_ug       NUMERIC(8,4)
├── folate_dfe_ug        NUMERIC(8,4)
├── cholesterol_mg       NUMERIC(8,4)
├── carbs_g              NUMERIC(8,4)
├── data_flags           TEXT                           -- "backfilled_micros(magnesium_mg,...)", "assumed_size"
├── price_snapshot_date  DATE NOT NULL                  -- Sept 2022 for v1
└── created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.21 `food_embeddings` (pgvector — Food Matcher)

**Decision on Q27 (embedding storage):** Separate table from `grocery_items`. Reasons:
- Embedding vectors are large (1536 floats for text-embedding-3-small = ~6KB each). Keeping them separate avoids bloating the main table for non-embedding queries.
- The `grocery_items` table is used for gap-efficiency ranking — it never needs the vector. Embedding lookups only happen in the Food Matcher (Skill A).
- The index (`ivfflat` or `hnsw`) is on this table alone, keeping `grocery_items` index-lean.

**Embedding source:** concatenation of `product_name + " " + usda_description + " " + brand` — gives the matcher the richest semantic signal.

```sql
food_embeddings
├── id               UUID PK DEFAULT gen_random_uuid()
├── grocery_item_id  UUID NOT NULL UNIQUE REFERENCES grocery_items(id)
├── fdc_id           VARCHAR(50) NOT NULL               -- denormalized for fast lookup
├── embedding        vector(1536)                      -- pgvector column (text-embedding-3-small)
├── embedding_source TEXT NOT NULL                     -- the concatenated string that was embedded
├── model            VARCHAR(100) NOT NULL              -- "text-embedding-3-small"
└── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()

CREATE INDEX ON food_embeddings USING hnsw (embedding vector_cosine_ops);
```

---

### 3.22 `agent_traces` (operational audit)

**Decision on Q30 (audit trail):** We do NOT build a full `audit_log` table for v1. Instead:
- Clinical actions (ratify, confirm focus set, upload lab) have `ratified_by`, `uploaded_by`, `set_by` FK columns on the relevant tables + `created_at`/`updated_at`. That's sufficient for the capstone.
- An `agent_traces` table captures LLM observability (complements Langfuse, which is the primary trace store).

```sql
agent_traces
├── id               UUID PK DEFAULT gen_random_uuid()
├── langfuse_trace_id VARCHAR(255)                     -- the Langfuse trace ID for correlation
├── agent_name       VARCHAR(100) NOT NULL              -- "intake_agent", "swap_sourcing_agent", etc.
├── patient_id       UUID REFERENCES patients(id)
├── cycle_id         UUID REFERENCES cycles(id)
├── trigger          VARCHAR(100)                       -- "new_lab", "receipt_upload", "weekly_cron", etc.
├── model            VARCHAR(100)                       -- "claude-opus-4-8", "claude-haiku-4-5-20251001"
├── input_tokens     INTEGER
├── output_tokens    INTEGER
├── cost_usd         NUMERIC(10,6)
├── status           VARCHAR(50)                        -- "success" | "failed" | "insufficient_data"
├── error_message    TEXT
└── created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### 3.23 Soft Deletes (Decision Q29)

**Rule:** Most tables use **logical soft delete** — set `deleted_at TIMESTAMPTZ` instead of removing the row. This matters for:
- `approved_list_items` (dietitian removes an item → keep for audit, hide from patient)
- `focus_set_items` (versioned, never deleted — older versions just have lower version number)
- `patient_choices` (superseded choices → `superseded_at`, not `deleted_at`)
- `nutrient_gaps` (resolved gap → `is_active = false`)

**Tables where hard delete is acceptable:**
- `agent_traces`, `food_embeddings` — operational/derived data, no clinical significance.

**Standard columns on all tables:** `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`. Apply `ON UPDATE` trigger or SQLAlchemy `onupdate` to maintain `updated_at`.

---

## Part 4 — Indexes

```sql
-- Hot query paths for each screen
CREATE INDEX ON patients (practice_id);
CREATE INDEX ON patient_dietitians (patient_id) WHERE ended_at IS NULL;
CREATE INDEX ON patient_dietitians (dietitian_id) WHERE ended_at IS NULL;
CREATE INDEX ON cycles (patient_id, status);
CREATE INDEX ON focus_set_items (cycle_id, version);
CREATE INDEX ON nutrient_gaps (patient_id);
CREATE INDEX ON approved_lists (patient_id, nutrient_gap_id);
CREATE INDEX ON approved_list_items (approved_list_id) WHERE removed_at IS NULL;
CREATE INDEX ON patient_choices (patient_id, cycle_id, nutrient_gap_id);
CREATE INDEX ON consumption_events (patient_id, consumed_date);
CREATE INDEX ON consumption_events (patient_id, source);
CREATE INDEX ON habit_model (patient_id);
CREATE INDEX ON nudges (patient_id, week_number);
CREATE INDEX ON lab_reports (patient_id, kind);
CREATE INDEX ON lab_analytes (lab_report_id);
CREATE INDEX ON lab_analytes (name, is_product_relevant);
CREATE INDEX ON cycle_outcomes (cycle_id);
CREATE INDEX ON grocery_items (fdc_id);
CREATE INDEX ON contraindication_rules (condition, is_active);
```

---

## Part 5 — Entity Relationship Diagram (ASCII)

```
┌───────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   practices   │──<──│    dietitians     │     │  patients       │
│               │     │ practice_id (FK)  │     │ practice_id (FK)│
└───────────────┘     └───────────────────┘     └────────┬────────┘
                               │                         │
                               └─────────<──────────────>┘
                                   patient_dietitians
                              (is_primary, started_at, ended_at)

patients ──< nutrient_gaps (one per nutrient, clinician-owned)
         │
         ├──< cycles ──< focus_set_items ──> nutrient_gaps
         │         │
         │         ├── baseline_lab_id ──> lab_reports ──< lab_analytes
         │         ├── retest_lab_id   ──> lab_reports
         │         └──< cycle_outcomes ──> focus_set_items
         │
         ├──< approved_lists ──< approved_list_items
         │    (one per nutrient_gap)
         │
         ├──< patient_choices ──> approved_list_items
         │    (history; latest = current)
         │
         ├──< receipts ──< receipt_line_items
         │
         ├──< habit_model (rolled-up from receipt_line_items)
         │
         ├──< consumption_events ──> nudges (source_nudge_id)
         │
         └──< nudges (one per food per week)

grocery_items ──< food_embeddings (pgvector, hnsw index)
grocery_items (fdc_id) ←── approved_list_items.fdc_id (soft ref)
grocery_items (fdc_id) ←── consumption_events.fdc_id (soft ref)
grocery_items (fdc_id) ←── habit_model.fdc_id (soft ref)

contraindication_rules (global, no patient FK)
agent_traces (patient_id, cycle_id — both nullable FKs)
```

---

## Part 6 — Decisions Summary Table (for tech team hand-off)

| # | Question | Decision |
|---|---|---|
| 1 | Dietitian ↔ patient | `patient_dietitians` join table; one primary + optional co-manager; historical rows kept with `ended_at` |
| 2 | Practice entity | Yes — `practices` table is top-level tenant |
| 3 | Auth (custom, no Clerk) | Shared `users` table with `role` + nullable FK to `dietitians` or `patients`; two login portals (`/login/dietitian`, `/login/patient`); bcrypt passwords; httpOnly cookie + Redis sessions |
| 4 | Cycle start | On patient enrollment; `start_date = enrolled_at` |
| 5 | Cycle status | 6 states: `pending_prioritization → active → lab_due → outcome_pending → completed / abandoned` |
| 6 | Mid-cycle revision | `focus_set_items.version` increments per revision; all versions kept; latest = current |
| 7 | Gap entity | Own table `nutrient_gaps`; FKed by focus set, approved lists, outcomes, choices |
| 8 | N+1 cycle carry-forward | Dietitian-initiated only; Agent 3 presents all unclosed gaps; dietitian chooses which to include |
| 9 | Approved list cardinality | One per `(patient, nutrient_gap)`; updated in-place; items soft-deleted when removed |
| 10 | Comorbidity flag | `TEXT` column on `approved_list_items`; null = clean; non-null = agent-flagged reason |
| 11 | Patient choice history | Insert-only; latest row = current; old rows get `superseded_at` |
| 12 | Amount storage | Yes — `servings_per_week` stored at decision time; not recomputed live |
| 13 | Habit model | Both: `receipt_line_items` (raw) + `habit_model` (rolled-up, what agents read) |
| 14 | Receipt entity | Yes — `receipts` table with S3 key + `receipt_line_items` child table |
| 15 | Consumption source | Enum: `photo | voice | text | nudge_confirmed | inferred` |
| 16 | Confidence model | `confidence_tier SMALLINT` 1–5 (1=photo, 5=inferred); dashboard excludes tier 5 |
| 17 | Nudge cadence guard | `UNIQUE (patient_id, food_name, week_number)` DB constraint + app check |
| 18 | Nudge → consumption FK | Yes — `consumption_events.source_nudge_id` FK to `nudges.id` |
| 19 | Nudge response | Enum: `yes | no | null`; "yes" → writes consumption event; no free-text in v1 |
| 20 | Lab values shape | Normalized `lab_analytes` table (one row per analyte); NOT JSONB |
| 21 | Mid-cycle labs | Supported via `kind = 'midcycle'`; don't affect outcome (only baseline + retest do) |
| 22 | Adherence score | `adherence_pct NUMERIC` + `adherence_classification VARCHAR` (adherent/partial/non_adherent) |
| 23 | Contraindication rule granularity | `target_type` = `nutrient` OR `food`; `severity` = `hard_exclude` or `soft_flag` |
| 24 | Rule ownership | Global (shared); no per-dietitian overrides in v1; `practice_id` FK left for future |
| 25 | Rule versioning | `updated_at` + `updated_by` only; no full audit trail in v1 |
| 26 | Food master table | Local `grocery_items` table (8,986 rows from CSV); `fdc_id` soft-ref from other tables |
| 27 | pgvector embeddings | Separate `food_embeddings` table; `hnsw` index; 1536-dim (text-embedding-3-small) |
| 28 | Price refresh | Static `price_snapshot_date` in v1; choices store price at decision time |
| 29 | Soft deletes | `deleted_at` on `approved_list_items`; `superseded_at` on `patient_choices`; `is_active` on gaps/rules |
| 30 | Audit trail | `_by` FK columns on clinical write tables; `agent_traces` for LLM observability; full audit_log = post-MVP |

---

## Part 7 — Open Questions (resolve before implementation starts)

1. **`patients.conditions` as TEXT[]**: works for v1. If we need to query by condition to pre-screen contraindication rules efficiently, consider a `patient_conditions` join table to a `conditions` master. Recommended: start with TEXT[], add FK table in migration if needed.

2. **Cycle auto-status advancement**: who advances `cycle.status` from `active` → `lab_due` → `outcome_pending`? Option A: a nightly scheduled job. Option B: a Postgres view (`lab_due_view`) that computes status from `retest_due_date`. Recommendation: **view for display, write the status on explicit events only** (lab upload, dietitian close action).

3. **`approved_lists` — cycle scoping**: if the same patient has two cycles with the same gap, they share one `approved_list`. Is that correct? Likely yes — the dietitian's approved foods for iron don't reset every cycle. Confirm before implementation.

4. **Langfuse vs. `agent_traces`**: if Langfuse is the primary trace store, the `agent_traces` table might be redundant. Recommendation: keep it as a lightweight FK bridge (for joining trace IDs to patient/cycle data in SQL reports), but don't replicate full payloads.
