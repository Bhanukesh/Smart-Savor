-- Dietitian-entered delivery number for automatic invite SMS (see lib/sms.ts).
ALTER TABLE "patients" ADD COLUMN "phone" TEXT;

-- Patient auth moved from a mocked identity (auth0_user_id, always "mock_<patientId>") to
-- real Google OAuth or real Twilio Verify OTP. Renamed, not dropped-and-recreated: same
-- column, same uniqueness guarantee, just no longer a placeholder value.
ALTER TABLE "users" RENAME COLUMN "auth0_user_id" TO "google_user_id";
ALTER INDEX "users_auth0_user_id_key" RENAME TO "users_google_user_id_key";
