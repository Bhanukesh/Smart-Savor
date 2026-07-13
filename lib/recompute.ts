/**
 * The USP recompute — how much of the chosen food closes the same target.
 * Byte-for-byte the same math as frontend/lib/api.ts `chooseFood`, so the FE's mock and this
 * backend produce identical results (Phase 3 integration is 1:1).
 */

export function fraction(n: number): string {
  const whole = Math.floor(n);
  const map: Record<number, string> = { 0: "", 0.25: "¼", 0.5: "½", 0.75: "¾" };
  const frac = map[Math.round((n - whole) * 4) / 4] ?? "";
  return whole === 0 ? frac || "0" : whole + frac;
}

export interface ChoiceInput {
  foodName: string;
  prep: string;
  servingDescription: string; // "1 cup", "¼ cup"
  amountPerServing: number; // nutrient qty per serving
  approved: boolean; // item.status === "approved"
  gapRemaining: number;
  gapUnit: string;
}

export interface ChoiceResult {
  foodName: string;
  prep: string;
  servingsText: string;
  gapClosedPct: number;
  stillApproved: boolean;
  gapUnit: string;
  gapRemaining: number;
}

export function computeChoice(i: ChoiceInput): ChoiceResult {
  const servings = Math.ceil((i.gapRemaining / i.amountPerServing) * 4) / 4;
  const base = i.servingDescription.replace(/^[\d¼½¾\s]+/, "").trim() || "serving";
  const plural = servings > 1 ? (base.endsWith("s") ? base : base + "s") : base;

  return {
    foodName: i.foodName,
    prep: i.prep,
    servingsText: `~${fraction(servings)} ${plural} of ${i.foodName.toLowerCase()}${i.prep ? ` (${i.prep})` : ""}`,
    gapClosedPct: 100,
    stillApproved: i.approved,
    gapUnit: i.gapUnit,
    gapRemaining: i.gapRemaining,
  };
}
