"""Shared Skills (tools the agents wrap) — with eval cases.

- Skill A — Food Matcher: resolve a messy receipt/log product name to a food in the
  reference table (fuzzy/token match), so nutrients + price attach. Used by Agent 2.
- Skill B — Gap Resolver: given a nutrient gap + constraints + habit model, rank
  gap-closing foods by efficiency + minimal disruption (cost optional). Used by Agent 4.

Plus a lightweight restriction/comorbidity screen (hard rules EXCLUDE; comorbidity
concerns FLAG for the dietitian to ratify — never the LLM's last word).
"""

from __future__ import annotations

import math
import re

import reference
import store

# --- tokenization ---------------------------------------------------------------
_STOP = {"oz", "ct", "count", "pack", "value", "great", "organic", "fresh", "frozen",
         "each", "lb", "lbs", "g", "kg", "ml", "the", "and", "with", "in", "of", "no",
         "free", "natural", "brand", "size", "pk", "ea", "can", "bag", "box", "jar"}


def _tokens(name: str) -> set[str]:
    words = re.sub(r"[^a-z0-9 ]", " ", (name or "").lower()).split()
    return {w for w in words if w not in _STOP and not w.isdigit() and len(w) > 1}


# --- Skill A — Food Matcher -----------------------------------------------------
_CATALOG: list[tuple[str, set[str], str | None]] | None = None   # (food, tokens, fdc_id)


def _catalog() -> list[tuple[str, set[str], str | None]]:
    global _CATALOG
    if _CATALOG is None:
        seen, cat = set(), []
        for r in reference.all_foods():
            f = r["food"]
            if f and f not in seen:
                seen.add(f)
                cat.append((f, _tokens(f), r.get("fdc_id")))
        _CATALOG = cat
    return _CATALOG


def food_matcher(query_name: str, min_confidence: float = 0.34) -> dict:
    """Resolve `query_name` -> best reference food. Returns
    {matched, food, fdc_id, match_confidence, flag}. flag='needs_review' when weak."""
    q = _tokens(query_name)
    if not q:
        return {"matched": False, "food": None, "fdc_id": None,
                "match_confidence": 0.0, "flag": "needs_review"}
    best, best_score = None, 0.0
    for food, toks, fdc in _catalog():
        if not toks:
            continue
        overlap = len(q & toks)
        if not overlap:
            continue
        score = overlap / len(q | toks)          # Jaccard on content tokens
        if q <= toks or toks <= q:               # full containment bonus
            score += 0.15
        if score > best_score:
            best, best_score = (food, fdc), score
    if not best or best_score < min_confidence:
        return {"matched": False, "food": None, "fdc_id": None,
                "match_confidence": round(best_score, 3), "flag": "needs_review"}
    return {"matched": True, "food": best[0], "fdc_id": best[1],
            "match_confidence": round(min(best_score, 0.99), 3), "flag": "ok"}


FOOD_MATCHER_EVALS = [
    {"query": "Fresh Green Bell Pepper, Each", "expect_token": "pepper"},
    {"query": "Goya Red Kidney Beans", "expect_token": "kidney"},
    {"query": "Guava Fruit", "expect_token": "guava"},
    {"query": "zzzq nonfood widget", "expect_match": False},   # ambiguous negative
]


# --- restriction / comorbidity screen -------------------------------------------
_RESTRICTION_EXCLUDE = {
    "vegetarian": ("beef", "chicken", "pork", "turkey", "fish", "salmon", "tuna",
                   "oyster", "shrimp", "meat", "bacon", "sausage", "ham", "anchovy"),
    "vegan": ("beef", "chicken", "pork", "fish", "oyster", "meat", "milk", "cheese",
              "butter", "egg", "yogurt", "honey"),
    "pescatarian": ("beef", "chicken", "pork", "turkey", "bacon", "sausage", "ham"),
}
# comorbidity -> keywords that warrant a dietitian FLAG (kept, not dropped)
_COMORBIDITY_FLAG = {
    "type-2 diabetes": ("sweetened", "syrup", "candy", "sugar", "cereal", "granola",
                        "juice", "soda", "dessert"),
    "type 2 diabetes": ("sweetened", "syrup", "candy", "sugar", "cereal", "granola",
                        "juice", "soda", "dessert"),
    "hypertension": ("salted", "cured", "bacon", "sausage", "pickled", "brine"),
    "cardiovascular risk": ("fried", "lard", "bacon", "sausage"),
}


def screen_food(food_name: str, restrictions: list[str], conditions: list[str]) -> dict:
    """Return {action: exclude|flag|ok, reason}. Restrictions hard-EXCLUDE; comorbidity
    concerns FLAG (kept for the dietitian). Human ratifies — never the LLM's last word."""
    toks = _tokens(food_name)
    low = (food_name or "").lower()
    for r in restrictions or []:
        for kw in _RESTRICTION_EXCLUDE.get(r.lower(), ()):
            if kw in toks or kw in low:
                return {"action": "exclude", "reason": f"{r}: contains {kw}"}
    for c in conditions or []:
        for kw in _COMORBIDITY_FLAG.get(c.lower(), ()):
            if kw in toks or kw in low:
                return {"action": "flag", "reason": f"{c}: high-{kw} caution"}
    return {"action": "ok", "reason": None}


# --- Skill B — Gap Resolver -----------------------------------------------------
def _disruption(food_name: str, habit_model: dict) -> float:
    """0 (very close to current habits) .. 1 (novel). Lower = easier to adopt."""
    ftoks = _tokens(food_name)
    for item in (habit_model or {}):
        if _tokens(item) & ftoks:
            return 0.15
    return 0.6


def gap_resolver(nutrient: str, gap_size: float, *, habit_model: dict | None = None,
                 restrictions: list[str] | None = None, dislikes: list[str] | None = None,
                 conditions: list[str] | None = None, budget_per_serving: float | None = None,
                 limit: int = 3) -> dict:
    """Rank gap-closing foods for `nutrient` by efficiency + minimal disruption.
    Affordability is optional (budget_per_serving), never enforced by default."""
    candidates = store.query_reference(nutrient, exclude=dislikes, sort_by="gap_efficiency",
                                       limit=40)
    ranked = []
    for c in candidates:
        screen = screen_food(c["food"], restrictions or [], conditions or [])
        if screen["action"] == "exclude":
            continue
        if budget_per_serving is not None and c.get("price_per_serving_usd") is not None \
                and c["price_per_serving_usd"] > budget_per_serving:
            continue
        amount = c["amount"]
        disruption = _disruption(c["food"], habit_model or {})
        servings = math.ceil(gap_size / amount) if amount else None
        ranked.append({
            "food": c["food"], "fdc_id": c["fdc_id"], "serving": c["serving"],
            "amount_per_serving": amount, "unit": c["unit"],
            "servings_to_close": servings,
            "price_per_serving_usd": c.get("price_per_serving_usd"),
            "disruption": disruption,
            "comorbidity_flag": screen["reason"] if screen["action"] == "flag" else None,
            "why": f"{amount} {c['unit']}/serving; ~{servings} serving(s) close the "
                   f"{gap_size} {c['unit']} gap"
                   + ("; near current habits" if disruption < 0.3 else ""),
        })
    # gap-closing efficiency first, then minimal disruption
    ranked.sort(key=lambda r: (-r["amount_per_serving"], r["disruption"]))
    return {"nutrient": nutrient, "gap_size": gap_size,
            "candidates": ranked[:limit],
            "status": "ok" if ranked else "no_viable_swap"}


GAP_RESOLVER_EVALS = [
    {"nutrient": "iron", "gap": 9.0, "expect_nonempty": True},
    {"nutrient": "vitamin_c", "gap": 50.0, "expect_nonempty": True},
    {"nutrient": "magnesium", "gap": 120.0, "expect_nonempty": True},
    {"nutrient": "iron", "gap": 9.0, "restrictions": ["vegetarian"],
     "expect_no_token": "oyster"},   # restriction hard-excludes shellfish
]


# --- eval harness ---------------------------------------------------------------
def run_skill_evals() -> dict:
    results = {"food_matcher": [], "gap_resolver": []}
    for ev in FOOD_MATCHER_EVALS:
        r = food_matcher(ev["query"])
        if "expect_match" in ev and ev["expect_match"] is False:
            ok = not r["matched"]
        else:
            ok = r["matched"] and ev["expect_token"] in (r["food"] or "").lower()
        results["food_matcher"].append({"query": ev["query"], "pass": ok, "got": r["food"]})
    for ev in GAP_RESOLVER_EVALS:
        r = gap_resolver(ev["nutrient"], ev["gap"], restrictions=ev.get("restrictions"))
        cands = r["candidates"]
        if ev.get("expect_nonempty"):
            ok = len(cands) > 0
        elif "expect_no_token" in ev:
            ok = all(ev["expect_no_token"] not in c["food"].lower() for c in cands)
        else:
            ok = True
        results["gap_resolver"].append({"case": ev, "pass": ok, "n": len(cands)})
    passed = sum(x["pass"] for v in results.values() for x in v)
    total = sum(len(v) for v in results.values())
    results["summary"] = f"{passed}/{total} eval cases passed"
    return results
