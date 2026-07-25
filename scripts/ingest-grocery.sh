#!/usr/bin/env bash
# Ingests docs/Dataset/Grocery_Nutrition.csv into the grocery_items table.
# Idempotent: truncates first, so re-running just re-loads the same 8,986 rows.
set -euo pipefail

cd "$(dirname "$0")/.."

CONTAINER="smartsavor-db"
CSV="docs/Dataset/Grocery_Nutrition.csv"
COLUMNS="department,category,product_name,brand,price_usd,package_size,price_per_100g_usd,product_url,fdc_id,usda_description,usda_source,match_confidence,serving_size_g,household_serving,calories_kcal,protein_g,total_fat_g,sat_fat_g,mono_fat_g,poly_fat_g,trans_fat_g,cholesterol_mg,carbs_g,fiber_g,sugars_g,added_sugars_g,sodium_mg,potassium_mg,calcium_mg,iron_mg,magnesium_mg,zinc_mg,vitamin_c_mg,vitamin_d_iu,vitamin_a_rae_ug,vitamin_b12_ug,folate_dfe_ug,data_flags"

docker exec "$CONTAINER" psql -U postgres -d smartsavor -c "TRUNCATE grocery_items;"
cat "$CSV" | docker exec -i "$CONTAINER" psql -U postgres -d smartsavor \
  -c "\copy grocery_items($COLUMNS) FROM STDIN WITH (FORMAT csv, HEADER true, NULL '')"

docker exec "$CONTAINER" psql -U postgres -d smartsavor -c "SELECT count(*) AS rows_loaded FROM grocery_items;"
