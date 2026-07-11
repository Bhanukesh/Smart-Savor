/**
 * Smart Savor API client.
 *
 * Phase 1: every function returns seeded mock data (below).
 * Phase 3 integration: replace each body with a `fetch(`${API_BASE}/...`)` call to the
 * FastAPI backend. The return types (lib/types.ts) are the contract, so components never change.
 *
 * The USP recompute (`chooseFood`) lives here because in production the backend/Agent 4 owns it;
 * keeping it behind the client means the swap page doesn't care whether it's local or remote.
 */
import type {
  Patient, FocusItem, ApprovedList, ApprovedListItem, ChoiceResult, DashboardGauge,
} from "./types";
import {
  PATIENT, FOCUS_SET, IRON_APPROVED_LIST, IRON_GAP_REMAINING, DASHBOARD,
} from "./mock";

// export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";  // set in Phase 3
const MOCK_LATENCY = 120; // ms — simulate the network so loading states are exercised
const wait = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), MOCK_LATENCY));

export function getPatient(): Promise<Patient> {
  return wait(PATIENT);
}

export function getFocusSet(): Promise<FocusItem[]> {
  return wait(FOCUS_SET);
}

export function getApprovedList(nutrient: string): Promise<ApprovedList> {
  // Phase 3: GET /patients/:id/approved-lists/:nutrient
  void nutrient;
  return wait(IRON_APPROVED_LIST);
}

export function getDashboard(): Promise<DashboardGauge[]> {
  return wait(DASHBOARD);
}

/** amount to close the remaining gap, in whole/quarter servings (mirrors the prototype math) */
function fraction(n: number): string {
  const whole = Math.floor(n);
  const map: Record<number, string> = { 0: "", 0.25: "¼", 0.5: "½", 0.75: "¾" };
  const frac = map[Math.round((n - whole) * 4) / 4] ?? "";
  return whole === 0 ? frac || "0" : whole + frac;
}

/**
 * The USP: patient picks a food → recompute how much of IT closes the same target.
 * Y = ceil(gapRemaining / amountPerServing), rounded to the nearest ¼ serving.
 */
export function chooseFood(
  item: ApprovedListItem,
  gapRemaining: number = IRON_GAP_REMAINING,
): Promise<ChoiceResult> {
  const servings = Math.ceil((gapRemaining / item.amountPerServing) * 4) / 4;
  const unitWord =
    item.servingDescription.replace(/^1\s*/, "") + (servings === 1 ? "" : servings > 1 ? "s" : "");
  // "1 cup" -> "cup"/"cups"; "¼ cup" stays "cup"
  const base = item.servingDescription.replace(/^[\d¼½¾\s]+/, "").trim() || "serving";
  const plural = servings > 1 ? (base.endsWith("s") ? base : base + "s") : base;
  void unitWord;

  return wait<ChoiceResult>({
    foodName: item.foodName,
    prep: item.prep,
    servingsText: `~${fraction(servings)} ${plural} of ${item.foodName.toLowerCase()}${item.prep ? ` (${item.prep})` : ""}`,
    gapClosedPct: 100,
    stillApproved: item.status === "approved",
    gapUnit: "mg",
    gapRemaining,
  });
}
