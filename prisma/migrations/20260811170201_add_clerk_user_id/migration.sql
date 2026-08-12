-- Dietitian auth moved to Clerk; clerkUserId links a User row to its Clerk account.
ALTER TABLE "users" ADD COLUMN "clerk_user_id" TEXT;
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");
