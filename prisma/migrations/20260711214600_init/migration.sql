-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('severe', 'moderate', 'mild');

-- CreateEnum
CREATE TYPE "ApprovedListStatus" AS ENUM ('draft', 'ratified');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('approved', 'flagged', 'excluded');

-- CreateTable
CREATE TABLE "practices" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietitians" (
    "id" UUID NOT NULL,
    "practice_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "credential" TEXT,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dietitians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "practice_id" UUID NOT NULL,
    "dietitian_id" UUID,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bmi" DECIMAL(5,2),
    "bp_systolic" INTEGER,
    "bp_diastolic" INTEGER,
    "labs" JSONB,
    "enrolled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrient_gaps" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "nutrient" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "current_value" DECIMAL(10,4) NOT NULL,
    "target_value" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrient_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycles" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "cycle_slug" TEXT,
    "start_date" DATE NOT NULL,
    "retest_due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "focus_set_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_set_items" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "nutrient_gap_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,
    "why" TEXT NOT NULL,
    "pair_with" TEXT,
    "conflicts_with" TEXT,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "exclude_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "focus_set_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_lists" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "nutrient_gap_id" UUID NOT NULL,
    "status" "ApprovedListStatus" NOT NULL DEFAULT 'draft',
    "ratified_by" TEXT,
    "ratified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approved_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_list_items" (
    "id" UUID NOT NULL,
    "approved_list_id" UUID NOT NULL,
    "food_name" TEXT NOT NULL,
    "fdc_id" TEXT,
    "serving_description" TEXT NOT NULL,
    "prep" TEXT NOT NULL DEFAULT '',
    "amount_per_serving" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'ph-bowl-food',
    "status" "ItemStatus" NOT NULL DEFAULT 'approved',
    "note" TEXT NOT NULL DEFAULT '',
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approved_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_choices" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "nutrient_gap_id" UUID NOT NULL,
    "approved_list_item_id" UUID NOT NULL,
    "food_name" TEXT NOT NULL,
    "servings_text" TEXT NOT NULL,
    "gap_remaining" DECIMAL(10,4) NOT NULL,
    "gap_unit" TEXT NOT NULL,
    "gap_closed_pct" DECIMAL(5,2) NOT NULL,
    "still_approved" BOOLEAN NOT NULL,
    "chosen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMP(3),

    CONSTRAINT "patient_choices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_practice_id_idx" ON "patients"("practice_id");

-- CreateIndex
CREATE INDEX "nutrient_gaps_patient_id_idx" ON "nutrient_gaps"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "nutrient_gaps_patient_id_nutrient_key" ON "nutrient_gaps"("patient_id", "nutrient");

-- CreateIndex
CREATE INDEX "cycles_patient_id_status_idx" ON "cycles"("patient_id", "status");

-- CreateIndex
CREATE INDEX "focus_set_items_cycle_id_version_idx" ON "focus_set_items"("cycle_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "approved_lists_patient_id_nutrient_gap_id_key" ON "approved_lists"("patient_id", "nutrient_gap_id");

-- CreateIndex
CREATE INDEX "approved_list_items_approved_list_id_idx" ON "approved_list_items"("approved_list_id");

-- CreateIndex
CREATE INDEX "patient_choices_patient_id_cycle_id_nutrient_gap_id_idx" ON "patient_choices"("patient_id", "cycle_id", "nutrient_gap_id");

-- AddForeignKey
ALTER TABLE "dietitians" ADD CONSTRAINT "dietitians_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_dietitian_id_fkey" FOREIGN KEY ("dietitian_id") REFERENCES "dietitians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrient_gaps" ADD CONSTRAINT "nutrient_gaps_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_set_items" ADD CONSTRAINT "focus_set_items_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_set_items" ADD CONSTRAINT "focus_set_items_nutrient_gap_id_fkey" FOREIGN KEY ("nutrient_gap_id") REFERENCES "nutrient_gaps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_lists" ADD CONSTRAINT "approved_lists_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_lists" ADD CONSTRAINT "approved_lists_nutrient_gap_id_fkey" FOREIGN KEY ("nutrient_gap_id") REFERENCES "nutrient_gaps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_list_items" ADD CONSTRAINT "approved_list_items_approved_list_id_fkey" FOREIGN KEY ("approved_list_id") REFERENCES "approved_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_choices" ADD CONSTRAINT "patient_choices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_choices" ADD CONSTRAINT "patient_choices_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_choices" ADD CONSTRAINT "patient_choices_nutrient_gap_id_fkey" FOREIGN KEY ("nutrient_gap_id") REFERENCES "nutrient_gaps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_choices" ADD CONSTRAINT "patient_choices_approved_list_item_id_fkey" FOREIGN KEY ("approved_list_item_id") REFERENCES "approved_list_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
