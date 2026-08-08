-- CreateEnum
CREATE TYPE "ReceiptParseStatus" AS ENUM ('pending', 'parsed', 'failed', 'needs_review');

-- CreateEnum
CREATE TYPE "ReceiptLineMatchFlag" AS ENUM ('ok', 'needs_review', 'ambiguous', 'no_match');

-- CreateEnum
CREATE TYPE "HabitSource" AS ENUM ('receipt', 'manual', 'none');

-- CreateEnum
CREATE TYPE "ConsumptionSource" AS ENUM ('photo', 'voice', 'text', 'nudge_confirmed', 'inferred');

-- CreateEnum
CREATE TYPE "ConsumptionFlag" AS ENUM ('ok', 'needs_review');

-- CreateEnum
CREATE TYPE "FocusItemOutcomeStatus" AS ENUM ('in_progress', 'closed', 'carried_forward', 'deferred');

-- CreateEnum
CREATE TYPE "AdherenceClassification" AS ENUM ('adherent', 'partial', 'non_adherent');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('patient', 'dietitian');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('dietitian', 'patient');

-- AlterTable
ALTER TABLE "cycles" ADD COLUMN     "previous_cycle_id" UUID;

-- AlterTable
ALTER TABLE "grocery_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "weekly_nudge_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "cycle_outcomes" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "focus_set_item_id" UUID,
    "nutrient_gap_id" UUID NOT NULL,
    "baseline_value" DECIMAL(10,4) NOT NULL,
    "retest_value" DECIMAL(10,4),
    "delta" DECIMAL(10,4),
    "improved" BOOLEAN,
    "outcome_status" "FocusItemOutcomeStatus" NOT NULL DEFAULT 'in_progress',
    "adherence_pct" DECIMAL(5,2),
    "adherence_classification" "AdherenceClassification",
    "computed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cycle_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchased_at" DATE,
    "retailer" TEXT,
    "s3_key" TEXT NOT NULL,
    "parse_status" "ReceiptParseStatus" NOT NULL DEFAULT 'pending',
    "agent_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_line_items" (
    "id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "raw_text" TEXT NOT NULL,
    "matched_food" TEXT,
    "fdc_id" TEXT,
    "quantity" DECIMAL(10,3),
    "price_usd" DECIMAL(10,2),
    "match_confidence" DECIMAL(4,3),
    "match_flag" "ReceiptLineMatchFlag" NOT NULL DEFAULT 'ok',
    "confirmed" BOOLEAN,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_model" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "food_name" TEXT NOT NULL,
    "fdc_id" TEXT,
    "freq_per_week" DECIMAL(5,2) NOT NULL,
    "last_seen_date" DATE,
    "source" "HabitSource" NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habit_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumption_events" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "food_name" TEXT NOT NULL,
    "fdc_id" TEXT,
    "quantity_servings" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "raw_input" TEXT,
    "consumed_date" DATE NOT NULL,
    "source" "ConsumptionSource" NOT NULL,
    "confidence_tier" SMALLINT,
    "match_confidence" DECIMAL(4,3),
    "flag" "ConsumptionFlag" NOT NULL DEFAULT 'ok',
    "source_receipt_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumption_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_check_ins" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "weight_lb" DECIMAL(6,2) NOT NULL,
    "checked_in_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "dietitian_id" UUID NOT NULL,
    "sender_role" "MessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_invites" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "issued_by" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "redeemed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "auth0_user_id" TEXT,
    "role" "UserRole" NOT NULL,
    "dietitian_id" UUID,
    "patient_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "password_reset_token" TEXT,
    "password_reset_token_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_role_shape_check" CHECK (
        (role = 'dietitian' AND dietitian_id IS NOT NULL AND patient_id IS NULL) OR
        (role = 'patient' AND patient_id IS NOT NULL AND dietitian_id IS NULL)
    )
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cycle_outcomes_cycle_id_nutrient_gap_id_key" ON "cycle_outcomes"("cycle_id", "nutrient_gap_id");

-- CreateIndex
CREATE INDEX "receipts_patient_id_upload_date_idx" ON "receipts"("patient_id", "upload_date");

-- CreateIndex
CREATE INDEX "receipt_line_items_receipt_id_idx" ON "receipt_line_items"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "habit_model_patient_id_food_name_key" ON "habit_model"("patient_id", "food_name");

-- CreateIndex
CREATE INDEX "consumption_events_patient_id_consumed_date_idx" ON "consumption_events"("patient_id", "consumed_date");

-- CreateIndex
CREATE INDEX "weight_check_ins_patient_id_checked_in_at_idx" ON "weight_check_ins"("patient_id", "checked_in_at");

-- CreateIndex
CREATE INDEX "messages_patient_id_created_at_idx" ON "messages"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_dietitian_id_read_at_idx" ON "messages"("dietitian_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "patient_invites_patient_id_key" ON "patient_invites"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_invites_code_key" ON "patient_invites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0_user_id_key" ON "users"("auth0_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_dietitian_id_key" ON "users"("dietitian_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_patient_id_key" ON "users"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_previous_cycle_id_fkey" FOREIGN KEY ("previous_cycle_id") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_outcomes" ADD CONSTRAINT "cycle_outcomes_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_outcomes" ADD CONSTRAINT "cycle_outcomes_focus_set_item_id_fkey" FOREIGN KEY ("focus_set_item_id") REFERENCES "focus_set_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_outcomes" ADD CONSTRAINT "cycle_outcomes_nutrient_gap_id_fkey" FOREIGN KEY ("nutrient_gap_id") REFERENCES "nutrient_gaps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line_items" ADD CONSTRAINT "receipt_line_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_model" ADD CONSTRAINT "habit_model_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_events" ADD CONSTRAINT "consumption_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_events" ADD CONSTRAINT "consumption_events_source_receipt_id_fkey" FOREIGN KEY ("source_receipt_id") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_check_ins" ADD CONSTRAINT "weight_check_ins_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_dietitian_id_fkey" FOREIGN KEY ("dietitian_id") REFERENCES "dietitians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_invites" ADD CONSTRAINT "patient_invites_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_invites" ADD CONSTRAINT "patient_invites_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "dietitians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_dietitian_id_fkey" FOREIGN KEY ("dietitian_id") REFERENCES "dietitians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
