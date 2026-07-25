-- AlterTable
ALTER TABLE "cycles" ADD COLUMN     "focus_set_confirmed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "grocery_items" (
    "id" UUID NOT NULL,
    "department" TEXT,
    "category" TEXT,
    "product_name" TEXT NOT NULL,
    "brand" TEXT,
    "price_usd" DECIMAL(10,4),
    "package_size" TEXT,
    "price_per_100g_usd" DECIMAL(10,6),
    "product_url" TEXT,
    "fdc_id" TEXT NOT NULL,
    "usda_description" TEXT,
    "usda_source" TEXT,
    "match_confidence" TEXT,
    "serving_size_g" DECIMAL(10,3),
    "household_serving" TEXT,
    "calories_kcal" DECIMAL(10,2),
    "protein_g" DECIMAL(10,4),
    "total_fat_g" DECIMAL(10,4),
    "sat_fat_g" DECIMAL(10,4),
    "mono_fat_g" DECIMAL(10,4),
    "poly_fat_g" DECIMAL(10,4),
    "trans_fat_g" DECIMAL(10,4),
    "cholesterol_mg" DECIMAL(10,4),
    "carbs_g" DECIMAL(10,4),
    "fiber_g" DECIMAL(10,4),
    "sugars_g" DECIMAL(10,4),
    "added_sugars_g" DECIMAL(10,4),
    "sodium_mg" DECIMAL(14,4),
    "potassium_mg" DECIMAL(14,4),
    "calcium_mg" DECIMAL(12,4),
    "iron_mg" DECIMAL(12,4),
    "magnesium_mg" DECIMAL(12,4),
    "zinc_mg" DECIMAL(12,4),
    "vitamin_c_mg" DECIMAL(12,4),
    "vitamin_d_iu" DECIMAL(12,4),
    "vitamin_a_rae_ug" DECIMAL(12,4),
    "vitamin_b12_ug" DECIMAL(12,4),
    "folate_dfe_ug" DECIMAL(12,4),
    "data_flags" TEXT,
    "price_snapshot_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grocery_items_pkey" PRIMARY KEY ("id")
);

-- Prisma's @default(uuid()) is client-side only; the bulk CSV ingestion (scripts/ingest-grocery.sh)
-- bypasses Prisma Client via `\copy`, so `id` needs a real DB-level default.
ALTER TABLE "grocery_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- CreateIndex
CREATE INDEX "grocery_items_fdc_id_idx" ON "grocery_items"("fdc_id");

-- CreateIndex
CREATE INDEX "grocery_items_department_idx" ON "grocery_items"("department");
