/**
 * Mirrors /lib/types.ts in the Next.js app — the API contract this app's screens are built
 * against. Kept as a small hand-maintained copy rather than a shared package: the source file
 * is ~15 stable interfaces that change rarely, and a real npm-workspace type-share would mean
 * restructuring the root package.json of the already-deployed web app for a low-churn file.
 * Keep in sync by hand if the source changes.
 */

export type Severity = "severe" | "moderate" | "mild";
export type FocusOutcomeStatus = "in_progress" | "closed" | "carried_forward" | "deferred";
export type ApprovedListStatus = "draft" | "ratified";
export type NutrientKey =
  | "iron" | "vitamin_c" | "magnesium" | "calcium" | "potassium" | "zinc"
  | "fiber" | "protein" | "folate" | "vitamin_d" | "vitamin_b12" | "sodium";

export interface Patient {
  id: string;
  name: string;
  age: number;
  conditions: string[];
  restrictions: string[];
  dislikes: string[];
  weeklyBudgetUsd?: number;
  bmi: number;
  bpSystolic: number;
  bpDiastolic: number;
  dietitianName: string;
  labs: { name: string; value: string; flag?: "High" | "Low" | "Normal" }[];
  enrolledAt?: string;
  weeklyNudgeEnabled: boolean;
}

export interface NutrientGap {
  id: string;
  nutrient: NutrientKey;
  label: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  severity: Severity;
}

export interface FocusItem {
  id: string;
  rank: number;
  gap: NutrientGap;
  why: string;
  pairWith?: string;
  conflictsWith?: string;
  excluded?: boolean;
  excludeReason?: string;
}

export interface ApprovedListItem {
  id: string;
  foodName: string;
  fdcId?: string;
  servingDescription: string;
  prep: string;
  amountPerServing: number;
  unit: string;
  icon: string;
  status: "approved" | "flagged" | "excluded";
  note: string;
  edited?: boolean;
}

export interface ApprovedList {
  gap: NutrientGap;
  status: ApprovedListStatus;
  ratifiedBy?: string;
  items: ApprovedListItem[];
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

/** one day's on-track/off-track status in a gauge's last-7-days history */
export interface DashboardGaugeDay {
  date: string;
  onTrack: boolean;
}

export interface DashboardGauge {
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

export interface NutrientHistory {
  nutrient: NutrientKey;
  label: string;
  unit: string;
  targetValue: number;
  cycles: CycleOutcomeEntry[];
}

export interface MessageEntry {
  id: string;
  senderRole: "patient" | "dietitian";
  body: string;
  createdAt: string;
  readAt?: string;
}

export interface WeightCheckInEntry {
  id: string;
  weightLb: number;
  checkedInAt: string;
  note?: string;
}

export interface ConsumptionEntry {
  id: string;
  foodName: string;
  quantityServings: number;
  consumedDate: string;
  source: "photo" | "voice" | "text" | "nudge_confirmed" | "inferred";
  flag: "ok" | "needs_review";
}

export type ReceiptParseStatus = "pending" | "parsed" | "failed" | "needs_review";

export interface ReceiptSummary {
  id: string;
  uploadDate: string;
  retailer?: string;
  parseStatus: ReceiptParseStatus;
  itemCount: number;
  pendingReviewCount: number;
}

export interface ReceiptLineItemEntry {
  id: string;
  rawText: string;
  matchedFood?: string;
  quantity?: number;
  priceUsd?: number;
  matchFlag: "ok" | "needs_review" | "ambiguous" | "no_match";
  confirmed: boolean | null;
}

export interface ReceiptDetail {
  id: string;
  uploadDate: string;
  retailer?: string;
  parseStatus: ReceiptParseStatus;
  lineItems: ReceiptLineItemEntry[];
}

export type LabReportParseStatus = "pending" | "parsed" | "failed";

export interface LabReportSummary {
  id: string;
  uploadDate: string;
  parseStatus: LabReportParseStatus;
  findingCount: number;
  pendingReviewCount: number;
}

export interface LabReportFindingEntry {
  id: string;
  nutrient: NutrientKey;
  label: string;
  currentValue: number;
  unit: string;
  confirmed: boolean | null;
}

export interface LabReportDetail {
  id: string;
  uploadDate: string;
  parseStatus: LabReportParseStatus;
  findings: LabReportFindingEntry[];
}
