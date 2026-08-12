-- Patient auth moved from a mocked identity (auth0_user_id, always "mock_<patientId>") to
-- real Google Sign-In via a separate, dedicated Clerk application (see lib/patientClerk.ts —
-- deliberately not the dietitian Clerk app, which runs in Restricted mode). Renamed, not
-- dropped-and-recreated: same column, same uniqueness guarantee, just no longer a placeholder.
ALTER TABLE "users" RENAME COLUMN "auth0_user_id" TO "google_user_id";
ALTER INDEX "users_auth0_user_id_key" RENAME TO "users_google_user_id_key";

-- Dietitian-entered delivery address for the patient invite email (Clerk invitation — see
-- lib/patientClerk.ts), so "Send invite" can resend later without asking again.
ALTER TABLE "patients" ADD COLUMN "email" TEXT;
