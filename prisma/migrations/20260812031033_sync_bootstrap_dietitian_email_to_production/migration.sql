-- Data fix, not a schema change. Production's dietitian seat was created by the one-time
-- production seed (months ago, before the Clerk migration existed) with the old placeholder
-- email ("maria@metronutrition.example"). DIETITIAN_BOOTSTRAP_EMAIL (the real Google account
-- meant to claim this seat — see prisma/seed.ts, lib/auth/dietitian.ts) only ever gets applied
-- by that seed script, which is deliberately never re-run against production, so the two drifted:
-- the seat existed, but under an email nobody could actually sign in as via Google.
--
-- Matches any unclaimed dietitian seat (role=dietitian, no linked Clerk account yet) rather than
-- hardcoding the old email string, since that's the actual condition that matters — safe to run
-- again (idempotent: no unclaimed seats left after the first run means this is a no-op).
UPDATE "users"
SET "email" = 'panthangisaiprasad@gmail.com'
WHERE "role" = 'dietitian' AND "clerk_user_id" IS NULL;
