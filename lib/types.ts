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
  /** Dietitian-entered delivery address for the invite email (lib/patientClerk.ts) — distinct
   * from the patient's own email on User once they've actually signed up. */
  email?: string;
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
  enrolledAt?: string;
  weeklyNudgeEnabled: boolean;
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
  /** the FocusSetItem row's id — update/delete route on it directly */
  id: string;
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

/** patient_choices — the currently active (non-superseded) pick per focus gap, for this
 * cycle. What the "shopping list" is built from: whichever food is currently selected on the
 * Swap screen for each focus area. */
export interface ShoppingListItem {
  nutrientGapId: string;
  nutrientLabel: string;
  foodName: string;
  servingsText: string;
  chosenAt: string;
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

/** one day's on-track/off-track status in a gauge's last-7-days history */
export interface DashboardGaugeDay {
  date: string;
  onTrack: boolean;
}

/** patient dashboard gauge (intake toward target, from logged foods) */
export interface DashboardGauge {
  /** the underlying NutrientGap id — lets a focus-set item match itself to its own gauge */
  gapId: string;
  label: string;
  icon: string;
  current: number;
  target: number;
  baseline: number;
  unit: string;
  inRange: boolean;
  caption: string;
  /** last 7 days, oldest first — cumulative baseline+logged as of that day vs target */
  history: DashboardGaugeDay[];
}

/** cycle_outcomes — one cycle's baseline->retest for one nutrient */
export interface CycleOutcomeEntry {
  cycleId: string;
  cycleSlug?: string;
  startDate: string;
  baselineValue: number;
  retestValue?: number;
  delta?: number;
  improved?: boolean;
  outcomeStatus: FocusOutcomeStatus;
}

/** one nutrient's progress across every cycle the patient has been through */
export interface NutrientHistory {
  nutrient: NutrientKey;
  label: string;
  unit: string;
  targetValue: number;
  cycles: CycleOutcomeEntry[];
}

/** messages — one entry in a patient<->dietitian thread */
export interface MessageEntry {
  id: string;
  senderRole: "patient" | "dietitian";
  body: string;
  createdAt: string;
  readAt?: string;
}

/** dietitian inbox row — one patient's thread, most recent first */
export interface MessageThreadSummary {
  patientId: string;
  patientName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

/** weight_check_ins — a self-reported weight, framed as clinical monitoring, never a
 * weight-loss target. */
export interface WeightCheckInEntry {
  id: string;
  weightLb: number;
  checkedInAt: string;
  note?: string;
}

/** consumption_events — a Quick Log entry (photo/voice/text) */
export interface ConsumptionEntry {
  id: string;
  foodName: string;
  quantityServings: number;
  consumedDate: string;
  source: "photo" | "voice" | "text" | "nudge_confirmed" | "inferred";
  flag: "ok" | "needs_review";
}

export type ReceiptParseStatus = "pending" | "parsed" | "failed" | "needs_review";

/** receipts — list view */
export interface ReceiptSummary {
  id: string;
  uploadDate: string;
  retailer?: string;
  parseStatus: ReceiptParseStatus;
  itemCount: number;
  pendingReviewCount: number;
}

/** receipt_line_items — one line, with the patient's review state */
export interface ReceiptLineItemEntry {
  id: string;
  rawText: string;
  matchedFood?: string;
  quantity?: number;
  priceUsd?: number;
  matchFlag: "ok" | "needs_review" | "ambiguous" | "no_match";
  /** null = awaiting review · true = confirmed mine · false = excluded (not mine) */
  confirmed: boolean | null;
}

/** receipts + its line items — the review/confirm screen */
export interface ReceiptDetail {
  id: string;
  uploadDate: string;
  retailer?: string;
  parseStatus: ReceiptParseStatus;
  lineItems: ReceiptLineItemEntry[];
}

export type LabReportParseStatus = "pending" | "parsed" | "failed";

/** lab_reports — list view */
export interface LabReportSummary {
  id: string;
  uploadDate: string;
  parseStatus: LabReportParseStatus;
  findingCount: number;
  pendingReviewCount: number;
}

/** lab_report_findings — one transcribed analyte, with the dietitian's review state */
export interface LabReportFindingEntry {
  id: string;
  nutrient: NutrientKey;
  label: string;
  currentValue: number;
  unit: string;
  /** null = awaiting dietitian review · true = confirmed (materialized into a NutrientGap) · false = rejected */
  confirmed: boolean | null;
}

/** lab_reports + its findings — the review/confirm screen */
export interface LabReportDetail {
  id: string;
  uploadDate: string;
  parseStatus: LabReportParseStatus;
  findings: LabReportFindingEntry[];
}
