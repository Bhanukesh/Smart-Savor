"""Reference table loader — the price × nutrient join the agents read.

Loads the real curated dataset (docs/Dataset/Grocery_Nutrition.csv, 8,986 products,
per-100g nutrients + serving_size_g) and melts it into a per-nutrient index where
each row carries the amount PER SERVING (per_100g x serving_g / 100) and the cost per
serving — exactly what the Gap Resolver / Swap Sourcing agent ranks by.

If the CSV is missing, callers fall back to store's tiny seed table, so the MCP still
runs. Loaded once, lazily, and cached.
"""

from __future__ import annotations

import csv
import os

_CSV = os.path.join(os.path.dirname(__file__), "..", "docs", "Dataset", "Grocery_Nutrition.csv")

# dataset column -> (nutrient key used across the app, unit)
NUTRIENT_COLUMNS = {
    "iron_mg": ("iron", "mg"),
    "vitamin_c_mg": ("vitamin_c", "mg"),
    "magnesium_mg": ("magnesium", "mg"),
    "calcium_mg": ("calcium", "mg"),
    "potassium_mg": ("potassium", "mg"),
    "zinc_mg": ("zinc", "mg"),
    "fiber_g": ("fiber", "g"),
    "protein_g": ("protein", "g"),
    "folate_dfe_ug": ("folate", "ug"),
    "vitamin_d_iu": ("vitamin_d", "IU"),
    "vitamin_b12_ug": ("vitamin_b12", "ug"),
    "sodium_mg": ("sodium", "mg"),
}

# Pragmatic plausibility caps to drop the dataset's known mislabeled rows (per-serving
# values entered as per-100g; see the methodology's data_quality_flag). A row is dropped
# if EITHER its per-100g value or its computed per-serving amount exceeds these ceilings.
MAX_PER_100G = {"iron": 75, "vitamin_c": 150, "magnesium": 400, "calcium": 1600,
                "potassium": 4000, "zinc": 100, "fiber": 80, "protein": 100,
                "folate": 4000, "vitamin_d": 4000, "vitamin_b12": 100, "sodium": 40000}
MAX_PER_SERVING = {"iron": 40, "vitamin_c": 300, "magnesium": 180, "calcium": 700,
                   "potassium": 1800, "zinc": 30, "fiber": 30, "protein": 70,
                   "folate": 1200, "vitamin_d": 2000, "vitamin_b12": 40, "sodium": 20000}

_INDEX: dict[str, list[dict]] | None = None   # nutrient -> rows (cached)


def _num(s: str) -> float | None:
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def available() -> bool:
    return os.path.exists(_CSV)


def _build_index() -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {k: [] for _, (k, _u) in NUTRIENT_COLUMNS.items()}
    if not available():
        return index
    with open(_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            serving_g = _num(row.get("serving_size_g", ""))
            if not serving_g:
                continue
            price_per_100g = _num(row.get("price_per_100g_usd", ""))
            for col, (nutrient, unit) in NUTRIENT_COLUMNS.items():
                per_100g = _num(row.get(col, ""))
                if per_100g is None or per_100g <= 0:
                    continue
                if per_100g > MAX_PER_100G.get(nutrient, 9e9):
                    continue                                      # mislabeled per-100g
                amount = round(per_100g * serving_g / 100.0, 3)   # per serving
                if amount > MAX_PER_SERVING.get(nutrient, 9e9):
                    continue                                      # serving-inflated error
                cost_serv = round(price_per_100g * serving_g / 100.0, 4) if price_per_100g else None
                index[nutrient].append({
                    "nutrient": nutrient,
                    "food": row.get("product_name", "").strip(),
                    "brand": row.get("brand", "").strip() or None,
                    "fdc_id": row.get("fdc_id", "").strip() or None,
                    "serving": row.get("household_serving", "").strip() or f"{serving_g:g} g",
                    "serving_g": serving_g,
                    "amount": amount,           # nutrient per serving
                    "unit": unit,
                    "per_100g": per_100g,
                    "price_per_serving_usd": cost_serv,
                    "cost_per_unit_nutrient": round(cost_serv / amount, 5) if (cost_serv and amount) else None,
                })
    return index


def _index() -> dict[str, list[dict]]:
    global _INDEX
    if _INDEX is None:
        _INDEX = _build_index()
    return _INDEX


def query(nutrient: str, exclude: list[str] | None = None,
          sort_by: str = "gap_efficiency", max_cost_per_unit: float | None = None,
          limit: int = 5) -> list[dict]:
    """Foods that supply `nutrient`, ranked. Returns [] if the real table isn't loaded
    (caller then falls back to the seed). See store.query_reference for the contract."""
    rows = list(_index().get(nutrient, []))
    if not rows:
        return []
    ex = {e.lower() for e in (exclude or [])}
    rows = [r for r in rows if r["food"].lower() not in ex]
    if max_cost_per_unit is not None:
        rows = [r for r in rows if r["cost_per_unit_nutrient"] is not None
                and r["cost_per_unit_nutrient"] <= max_cost_per_unit]
    if sort_by == "cost":
        rows.sort(key=lambda r: (r["cost_per_unit_nutrient"] is None, r["cost_per_unit_nutrient"] or 9e9))
    else:  # gap_efficiency: most nutrient per serving first
        rows.sort(key=lambda r: r["amount"], reverse=True)
    return rows[:limit]


def all_foods() -> list[dict]:
    """Flat list of every (food, nutrient) row — used by the Food Matcher (Skill A)."""
    return [r for rows in _index().values() for r in rows]
