/**
 * Smart Savor — API contract types.
 *
 * These mirror the Postgres schema in docs/Background/er-design.md. The FE is built
 * against this contract; in Phase 3 the FastAPI backend fulfils exactly these shapes,
 * so integration is a matter of swapping the mock implementations in lib/api.ts for
 * real `fetch` calls — no component changes.
 */

export type Severity = "severe" | "moderate" | "mild";
export type FocusOutcomeStatus = "in_progress" | "closed" | "carried_forward" | "deferred";
export type ApprovedListStatus = "draft" | "ratified";
export type NutrientKey =
  | "iron" | "vitamin_c" | "magnesium" | "calcium" | "potassium" | "zinc"
  | "fiber" | "protein" | "folate" | "vitamin_d" | "vitamin_b12" | "sodium";

/** patients (subset used by the FE) */
export interface Patient {
  id: string;
  name: string;
  age: number;
  conditions: string[];
  /** dietary preferences: restrictions (e.g. "vegetarian"), dislikes, weekly grocery budget */
  restrictions: string[];
  dislikes: string[];
  weeklyBudgetUsd?: number;
  bmi: number;
  bpSystolic: number;
  bpDiastolic: number;
  dietitianName: string;
  /** headline biomarkers for the snapshot card */
  labs: { name: string; value: string; flag?: "High" | "Low" | "Normal" }[];
}

/** nutrient_gaps */
export interface NutrientGap {
  id: string;
  nutrient: NutrientKey;
  label: string;        // display, e.g. "Iron (Fe)"
  currentValue: number;
  targetValue: number;
  unit: string;
  severity: Severity;
}

/** focus_set_items joined to nutrient_gaps — the D1.5 ranked set */
export interface FocusItem {
  rank: number;
  gap: NutrientGap;
  why: string;
  pairWith?: string;
  conflictsWith?: string;
  /** flagged-but-excluded (e.g. not food-first) */
  excluded?: boolean;
  excludeReason?: string;
}

/** approved_list_items — a ratified candidate the patient chooses from */
export interface ApprovedListItem {
  id: string;
  foodName: string;
  fdcId?: string;
  servingDescription: string;   // "1 cup"
  prep: string;                 // "cooked", "canned, rinsed"
  amountPerServing: number;     // nutrient qty per serving, in `unit`
  unit: string;
  icon: string;                 // phosphor icon name (fill)
  status: "approved" | "flagged" | "excluded";
  note: string;                 // clinician-facing rationale / screen result
  edited?: boolean;
}

/** approved_lists + its items for one gap */
export interface ApprovedList {
  gap: NutrientGap;
  status: ApprovedListStatus;
  ratifiedBy?: string;
  items: ApprovedListItem[];
}

/** the USP result — what save_patient_choice returns after recompute */
export interface ChoiceResult {
  foodName: string;
  prep: string;
  servingsText: string;         // "~1½ cups"
  gapClosedPct: number;         // typically 100
  stillApproved: boolean;
  gapUnit: string;
  gapRemaining: number;
}

/** patient dashboard gauge (intake toward target, from logged foods) */
export interface DashboardGauge {
  label: string;
  icon: string;
  current: number;
  target: number;
  baseline: number;
  unit: string;
  inRange: boolean;
  caption: string;
}
