/**
 * Server-side data access (Prisma). Single source of truth used BOTH by:
 *  - server components (pages call these directly — no HTTP hop), and
 *  - the /api route handlers (which wrap these for the client + external callers).
 * Never import this from a client component — it uses Prisma.
 */
import { prisma, num } from "./db";
import { computeChoice } from "./recompute";
import { matchFood } from "./foodLog";
import { parseReceipt } from "./receiptParser";
import { parseLabReport } from "./labReportParser";
import { saveUpload } from "./storage";
import type {
  Patient, FocusItem, ApprovedList, ChoiceResult, DashboardGauge, NutrientGap, NutrientKey, Severity,
  ConsumptionEntry, ReceiptSummary, ReceiptDetail, ReceiptLineItemEntry, WeightCheckInEntry,
  NutrientHistory, MessageEntry, MessageThreadSummary, LabReportSummary, LabReportDetail, LabReportFindingEntry,
} from "./types";

function serializeGap(g: {
  id: string; nutrient: string; label: string;
  currentValue: unknown; targetValue: unknown; unit: string; severity: string;
}): NutrientGap {
  return {
    id: g.id, nutrient: g.nutrient as NutrientKey, label: g.label,
    currentValue: num(g.currentValue), targetValue: num(g.targetValue),
    unit: g.unit, severity: g.severity as Severity,
  };
}

/** Onboard a brand-new patient from the roster's "Add patient" flow. Single-dietitian demo —
 * there's no dietitian session yet (documented gap, same as elsewhere in this file), so the
 * new patient is assigned to whichever dietitian owns this practice, same fallback pattern as
 * getDemoPatient(). The caller (the API route) follows this with generateInviteForPatient so
 * "add patient" and "send invite" land as one natural step, per how it was asked for. */
export async function createPatient(input: { name: string; age: number }): Promise<{ id: string } | null> {
  const dietitian = await prisma.dietitian.findFirst({ orderBy: { createdAt: "asc" } });
  if (!dietitian) return null;
  const patient = await prisma.patient.create({
    data: {
      practiceId: dietitian.practiceId,
      dietitianId: dietitian.id,
      name: input.name.trim(),
      age: input.age,
      enrolledAt: new Date(),
    },
  });
  return { id: patient.id };
}

/** Delete a patient and every row that hangs off them. No cascade delete is declared in the
 * schema (deliberately — a stray FK-triggered cascade is how you lose data you meant to
 * keep), so this walks the relation graph explicitly, children before parents, in one
 * transaction. Used for removing test/mistake patients from the console; there's no undo. */
export async function deletePatient(patientId: string): Promise<boolean> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) return false;

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { user: { patientId } } }),
    prisma.cycleOutcome.deleteMany({ where: { cycle: { patientId } } }),
    prisma.patientChoice.deleteMany({ where: { patientId } }),
    prisma.approvedListItem.deleteMany({ where: { approvedList: { patientId } } }),
    prisma.focusSetItem.deleteMany({ where: { cycle: { patientId } } }),
    prisma.approvedList.deleteMany({ where: { patientId } }),
    prisma.consumptionEvent.deleteMany({ where: { patientId } }),
    prisma.receiptLineItem.deleteMany({ where: { receipt: { patientId } } }),
    prisma.receipt.deleteMany({ where: { patientId } }),
    prisma.labReportFinding.deleteMany({ where: { labReport: { patientId } } }),
    prisma.labReport.deleteMany({ where: { patientId } }),
    prisma.habitModel.deleteMany({ where: { patientId } }),
    prisma.weightCheckIn.deleteMany({ where: { patientId } }),
    prisma.message.deleteMany({ where: { patientId } }),
    prisma.patientInvite.deleteMany({ where: { patientId } }),
    prisma.nutrientGap.deleteMany({ where: { patientId } }),
    prisma.cycle.deleteMany({ where: { patientId } }),
    prisma.user.deleteMany({ where: { patientId } }),
    prisma.patient.delete({ where: { id: patientId } }),
  ]);
  return true;
}

export type RosterStatus = "needs_review" | "awaiting_review" | "patient_message" | "on_track";

const ROSTER_STATUS_PRIORITY: Record<RosterStatus, number> = {
  needs_review: 0,
  awaiting_review: 1,
  patient_message: 2,
  on_track: 3,
};

/** Roster is sorted "needs dietitian action" first, not alphabetically — one canonical status
 * badge per patient, in priority order: a flagged swap-menu candidate awaiting a decision beats
 * a drafted-but-unconfirmed focus set, which beats an unread patient message, which beats
 * nothing-to-do ("on track"). All three signals are real existing state, not fabricated. */
export async function listPatients() {
  const ps = await prisma.patient.findMany({ include: { dietitian: true } });
  const patientIds = ps.map((p) => p.id);

  const unread = await prisma.message.groupBy({
    by: ["patientId"],
    where: { senderRole: "patient", readAt: null },
    _count: { _all: true },
  });
  const unreadByPatient = new Map(unread.map((u) => [u.patientId, u._count._all]));

  const flaggedLists = await prisma.approvedList.findMany({
    where: { patientId: { in: patientIds }, items: { some: { status: "flagged", removedAt: null } } },
    select: { patientId: true },
  });
  const needsReviewSet = new Set(flaggedLists.map((l) => l.patientId));

  // Sorted desc across all patients — the first row seen for a given patientId is necessarily
  // that patient's own most recent cycle, so a single pass gives us each patient's latest cycle.
  const cycles = await prisma.cycle.findMany({
    where: { patientId: { in: patientIds } },
    orderBy: { startDate: "desc" },
    select: { patientId: true, focusSetConfirmedAt: true },
  });
  const latestCycleByPatient = new Map<string, { focusSetConfirmedAt: Date | null }>();
  for (const c of cycles) {
    if (!latestCycleByPatient.has(c.patientId)) latestCycleByPatient.set(c.patientId, c);
  }

  const withStatus = ps.map((p) => {
    const unreadMessageCount = unreadByPatient.get(p.id) ?? 0;
    const needsFocusConfirm = latestCycleByPatient.get(p.id)?.focusSetConfirmedAt === null;
    const status: RosterStatus = needsReviewSet.has(p.id)
      ? "needs_review"
      : needsFocusConfirm
        ? "awaiting_review"
        : unreadMessageCount > 0
          ? "patient_message"
          : "on_track";
    return {
      id: p.id, name: p.name, age: p.age, conditions: p.conditions,
      dietitianName: p.dietitian?.name ?? "",
      unreadMessageCount, status,
    };
  });

  return withStatus.sort(
    (a, b) => ROSTER_STATUS_PRIORITY[a.status] - ROSTER_STATUS_PRIORITY[b.status] || a.name.localeCompare(b.name),
  );
}

/** Top-of-roster KPI strip — aggregate counts a dietitian scans before diving into any one
 * patient. avgAdherencePct reuses computeDashboard() per patient (demo-scale patient counts
 * make the repeated calls fine; same function already powers each patient's own dashboard). */
export async function getRosterKpis() {
  const patients = await listPatients();
  const totalPatients = patients.length;
  const needsReviewCount = patients.filter(
    (p) => p.status === "needs_review" || p.status === "awaiting_review",
  ).length;
  const unreadMessageTotal = patients.reduce((sum, p) => sum + p.unreadMessageCount, 0);

  const pcts: number[] = [];
  for (const p of patients) {
    const gauges = await computeDashboard(p.id);
    for (const g of gauges) {
      if (g.target > 0) pcts.push(Math.min(100, (g.current / g.target) * 100));
    }
  }
  const avgAdherencePct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;

  return { totalPatients, needsReviewCount, avgAdherencePct, unreadMessageTotal };
}

export async function getPatient(id: string): Promise<Patient | null> {
  const p = await prisma.patient.findUnique({ where: { id }, include: { dietitian: true } });
  if (!p) return null;
  return {
    id: p.id, name: p.name, age: p.age ?? 0, conditions: p.conditions,
    restrictions: p.restrictions, dislikes: p.dislikes,
    weeklyBudgetUsd: p.weeklyBudgetUsd !== null ? num(p.weeklyBudgetUsd) : undefined,
    bmi: num(p.bmi), bpSystolic: p.bpSystolic ?? 0, bpDiastolic: p.bpDiastolic ?? 0,
    dietitianName: p.dietitian?.name ?? "",
    labs: (p.labs as Patient["labs"]) ?? [],
    enrolledAt: p.enrolledAt?.toISOString(),
    weeklyNudgeEnabled: p.weeklyNudgeEnabled,
  };
}

/** Dietary preferences: restrictions, dislikes, weekly grocery budget, weekly-nudge toggle —
 * clinician/patient-entered. Backs the entire "Your Plan" section of /me/profile. */
export async function setDietaryPreferences(
  patientId: string,
  prefs: { restrictions?: string[]; dislikes?: string[]; weeklyBudgetUsd?: number; weeklyNudgeEnabled?: boolean },
): Promise<Patient | null> {
  const exists = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!exists) return null;
  await prisma.patient.update({
    where: { id: patientId },
    data: {
      ...(prefs.restrictions !== undefined && { restrictions: prefs.restrictions }),
      ...(prefs.dislikes !== undefined && { dislikes: prefs.dislikes }),
      ...(prefs.weeklyBudgetUsd !== undefined && { weeklyBudgetUsd: prefs.weeklyBudgetUsd }),
      ...(prefs.weeklyNudgeEnabled !== undefined && { weeklyNudgeEnabled: prefs.weeklyNudgeEnabled }),
    },
  });
  return getPatient(patientId);
}

/** The seeded demo patient (Sam) — for pages that aren't yet routed by patient id. */
export async function getDemoPatient(): Promise<Patient | null> {
  const first = await prisma.patient.findFirst({ orderBy: { createdAt: "asc" } });
  return first ? getPatient(first.id) : null;
}

/** Resolve the patient a console page should show: an explicit ?patient=<id>, or the demo patient
 * as a fallback so existing links (nav, homepage) keep working without a query param. */
export async function resolvePatient(patientId?: string): Promise<Patient | null> {
  return patientId ? getPatient(patientId) : getDemoPatient();
}

export async function getFocusSet(patientId: string): Promise<FocusItem[]> {
  const cycle = await prisma.cycle.findFirst({ where: { patientId }, orderBy: { startDate: "desc" } });
  if (!cycle) return [];
  const items = await prisma.focusSetItem.findMany({
    where: { cycleId: cycle.id, version: cycle.focusSetVersion },
    include: { nutrientGap: true },
    orderBy: { rank: "asc" },
  });
  return items.map((f) => ({
    rank: f.rank,
    gap: serializeGap(f.nutrientGap),
    why: f.why,
    pairWith: f.pairWith ?? undefined,
    conflictsWith: f.conflictsWith ?? undefined,
    excluded: f.excluded || undefined,
    excludeReason: f.excludeReason ?? undefined,
  }));
}

/** Dietitian's "Override ranking" — drag-and-drop reorder of the active (non-excluded) focus
 * items. `orderedNutrientGapIds` is the new top-to-bottom order; ranks are reassigned 1..N to
 * match. Excluded items aren't part of the ranking and keep whatever rank they had. */
export async function reorderFocusSet(
  patientId: string,
  orderedNutrientGapIds: string[],
): Promise<FocusItem[] | null> {
  const cycle = await prisma.cycle.findFirst({ where: { patientId }, orderBy: { startDate: "desc" } });
  if (!cycle) return null;
  await Promise.all(
    orderedNutrientGapIds.map((nutrientGapId, i) =>
      prisma.focusSetItem.updateMany({
        where: { cycleId: cycle.id, version: cycle.focusSetVersion, nutrientGapId },
        data: { rank: i + 1 },
      }),
    ),
  );
  return getFocusSet(patientId);
}

/** Nutrient gaps this patient has on file that aren't in the current cycle's focus set yet —
 * the pool "Add focus item" picks from. A gap can exist (e.g. from labs) without ever being
 * ranked; this is what lets a dietitian bring one in deliberately. */
export async function getAvailableNutrientGaps(patientId: string): Promise<NutrientGap[]> {
  const cycle = await prisma.cycle.findFirst({ where: { patientId }, orderBy: { startDate: "desc" } });
  if (!cycle) return [];
  const included = await prisma.focusSetItem.findMany({
    where: { cycleId: cycle.id, version: cycle.focusSetVersion },
    select: { nutrientGapId: true },
  });
  const gaps = await prisma.nutrientGap.findMany({
    where: { patientId, isActive: true, id: { notIn: included.map((f) => f.nutrientGapId) } },
    orderBy: { label: "asc" },
  });
  return gaps.map(serializeGap);
}

/** Dietitian's "Add focus item" — brings an off-list nutrient gap into the current cycle's
 * ranked focus set, appended at the bottom. Also seeds an empty draft ApprovedList for it if
 * one doesn't exist yet, so Ratify won't 404 if this item is later promoted to the top rank. */
export async function addFocusItem(
  patientId: string,
  nutrientGapId: string,
  why: string,
): Promise<FocusItem[] | null> {
  const cycle = await prisma.cycle.findFirst({ where: { patientId }, orderBy: { startDate: "desc" } });
  if (!cycle) return null;
  const gap = await prisma.nutrientGap.findFirst({ where: { id: nutrientGapId, patientId } });
  if (!gap) return null;

  const existing = await prisma.focusSetItem.findMany({
    where: { cycleId: cycle.id, version: cycle.focusSetVersion },
    select: { rank: true },
  });
  const maxRank = existing.reduce((m, f) => Math.max(m, f.rank), 0);

  await prisma.focusSetItem.create({
    data: {
      cycleId: cycle.id, nutrientGapId, version: cycle.focusSetVersion,
      rank: maxRank + 1, why: why.trim() || "Added by dietitian.",
    },
  });

  const hasList = await prisma.approvedList.findUnique({
    where: { patientId_nutrientGapId: { patientId, nutrientGapId } },
  });
  if (!hasList) {
    await prisma.approvedList.create({ data: { patientId, nutrientGapId, status: "draft" } });
  }

  return getFocusSet(patientId);
}

// Canonical label/unit per nutrient — matches the exact strings already used across
// prisma/seed.ts, so a dietitian-created gap reads identically to a seeded one.
const NUTRIENT_INFO: Record<NutrientKey, { label: string; unit: string }> = {
  iron: { label: "Iron (Fe)", unit: "mg" },
  vitamin_c: { label: "Vitamin C", unit: "mg" },
  magnesium: { label: "Magnesium", unit: "mg" },
  calcium: { label: "Calcium", unit: "mg" },
  potassium: { label: "Potassium", unit: "mg" },
  zinc: { label: "Zinc", unit: "mg" },
  fiber: { label: "Fiber", unit: "g" },
  protein: { label: "Protein", unit: "g" },
  folate: { label: "Folate", unit: "mcg" },
  vitamin_d: { label: "Vitamin D", unit: "ng/mL" },
  vitamin_b12: { label: "Vitamin B12", unit: "mcg" },
  sodium: { label: "Sodium", unit: "mg" },
};

/** Nutrients this patient has no NutrientGap row for at all yet — the pool "Track a new
 * nutrient gap" picks from. Deliberately disjoint from getAvailableNutrientGaps: that picker
 * re-surfaces gaps that already exist (e.g. previously excluded); this one is for a dietitian
 * noticing something new — nothing to pull from means there's genuinely nothing left to add,
 * which is exactly the gap "Add focus item" hit when a patient only has 1-2 gaps on file. */
export async function getCreatableNutrients(
  patientId: string,
): Promise<{ nutrient: NutrientKey; label: string; unit: string }[]> {
  const existing = await prisma.nutrientGap.findMany({ where: { patientId }, select: { nutrient: true } });
  const taken = new Set(existing.map((g) => g.nutrient));
  return (Object.keys(NUTRIENT_INFO) as NutrientKey[])
    .filter((n) => !taken.has(n))
    .map((n) => ({ nutrient: n, ...NUTRIENT_INFO[n] }));
}

/** Dietitian's "Track a new nutrient gap" — for when a patient simply doesn't have that
 * deficiency on file yet (the case getAvailableNutrientGaps can't help with: nothing to pull
 * from because nothing exists). Creates the NutrientGap from clinician-entered values, then
 * hands off to addFocusItem to rank it exactly like any other gap. */
export async function createAndAddFocusItem(
  patientId: string,
  input: { nutrient: NutrientKey; currentValue: number; targetValue: number; severity: Severity; why: string },
): Promise<FocusItem[] | null> {
  const info = NUTRIENT_INFO[input.nutrient];
  if (!info) return null;

  const gap = await prisma.nutrientGap.upsert({
    where: { patientId_nutrient: { patientId, nutrient: input.nutrient } },
    create: {
      patientId, nutrient: input.nutrient, label: info.label, unit: info.unit,
      currentValue: input.currentValue, targetValue: input.targetValue, severity: input.severity, isActive: true,
    },
    // A NutrientGap for this patient+nutrient combination can't already exist here —
    // getCreatableNutrients only offers nutrients with none on file — so this branch is
    // unreachable in practice; kept only so upsert has a valid update clause.
    update: {
      currentValue: input.currentValue, targetValue: input.targetValue, severity: input.severity, isActive: true,
    },
  });

  return addFocusItem(patientId, gap.id, input.why);
}

function serializeItem(it: {
  id: string; foodName: string; fdcId: string | null; servingDescription: string; prep: string;
  amountPerServing: unknown; unit: string; icon: string; status: string; note: string; edited: boolean;
}): ApprovedList["items"][number] {
  return {
    id: it.id, foodName: it.foodName, fdcId: it.fdcId ?? undefined,
    servingDescription: it.servingDescription, prep: it.prep,
    amountPerServing: num(it.amountPerServing), unit: it.unit, icon: it.icon,
    status: it.status as ApprovedList["items"][number]["status"], note: it.note, edited: it.edited || undefined,
  };
}

export async function getApprovedList(patientId: string, nutrient: string): Promise<ApprovedList | null> {
  const list = await prisma.approvedList.findFirst({
    where: { patientId, nutrientGap: { nutrient } },
    include: { nutrientGap: true, items: { orderBy: { rank: "asc" } } },
  });
  if (!list) return null;
  return {
    gap: serializeGap(list.nutrientGap),
    status: list.status,
    ratifiedBy: list.ratifiedBy ?? undefined,
    items: list.items.filter((it) => it.removedAt === null).map(serializeItem),
  };
}

/** Dietitian actions on the ratify screen: approve a flagged item, restore an excluded one, remove
 * an approved one (hides it from both ratify and patient views), or edit it — note text and/or
 * the quantity the patient will actually see (amount, unit, serving description). */
export async function updateApprovedListItem(
  itemId: string,
  action: "approve" | "restore" | "remove" | "edit",
  edits?: { note?: string; amountPerServing?: number; unit?: string; servingDescription?: string },
): Promise<ApprovedList["items"][number] | null> {
  const item = await prisma.approvedListItem.findUnique({ where: { id: itemId } });
  if (!item) return null;

  const updated = await prisma.approvedListItem.update({
    where: { id: itemId },
    data: {
      ...((action === "approve" || action === "restore") && { status: "approved" as const }),
      ...(action === "remove" && { removedAt: new Date() }),
      ...(action === "edit" && {
        edited: true,
        ...(edits?.note !== undefined && { note: edits.note }),
        ...(edits?.amountPerServing !== undefined && { amountPerServing: edits.amountPerServing }),
        ...(edits?.unit !== undefined && { unit: edits.unit }),
        ...(edits?.servingDescription !== undefined && { servingDescription: edits.servingDescription }),
      }),
    },
  });
  return serializeItem(updated);
}

/** Set when the dietitian confirms the ranked focus set (D1.5 gesture) — surfaced back so a page
 * reload doesn't lose the "published" state. */
export async function getCycleConfirmedAt(patientId: string): Promise<string | null> {
  const cycle = await prisma.cycle.findFirst({ where: { patientId }, orderBy: { startDate: "desc" } });
  return cycle?.focusSetConfirmedAt?.toISOString() ?? null;
}

export async function confirmFocusSet(patientId: string): Promise<string | null> {
  const cycle = await prisma.cycle.findFirst({ where: { patientId }, orderBy: { startDate: "desc" } });
  if (!cycle) return null;
  const updated = await prisma.cycle.update({
    where: { id: cycle.id },
    data: { focusSetConfirmedAt: new Date() },
  });
  return updated.focusSetConfirmedAt!.toISOString();
}

// Nutrient -> grocery_items column + a plausibility cap (per-100g). The CSV has a handful of
// encoding-error outliers (e.g. one oatmeal row claims 10,285 mg iron/100g); the cap keeps those
// out of ranked results without trying to fully clean the source data.
// vitamin_d is intentionally absent: the gap is tracked in blood-serum ng/mL, not comparable to
// dietary vitamin_d_iu — same reason it's excluded from the focus set (see prisma/seed.ts).
const NUTRIENT_COLUMN: Partial<Record<NutrientKey, { field: string; cap: number }>> = {
  iron: { field: "ironMg", cap: 100 },
  vitamin_c: { field: "vitaminCMg", cap: 2000 },
  magnesium: { field: "magnesiumMg", cap: 1000 },
  calcium: { field: "calciumMg", cap: 2500 },
  potassium: { field: "potassiumMg", cap: 10000 },
  zinc: { field: "zincMg", cap: 100 },
  fiber: { field: "fiberG", cap: 100 },
  protein: { field: "proteinG", cap: 100 },
  folate: { field: "folateDfeUg", cap: 2000 },
  vitamin_b12: { field: "vitaminB12Ug", cap: 100 },
  sodium: { field: "sodiumMg", cap: 15000 },
};

/** Ratify screen's search bar — free-text search across all 8,986 grocery_items by product
 * name or brand, independent of any nutrient (the dietitian is looking for a specific food). */
export async function searchGroceryItems(query: string, limit = 10) {
  const q = query.trim();
  if (!q) return [];
  const rows = await prisma.groceryItem.findMany({
    where: {
      OR: [
        { productName: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { productName: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    productName: r.productName,
    brand: r.brand ?? undefined,
    department: r.department ?? undefined,
    priceUsd: r.priceUsd !== null ? num(r.priceUsd) : undefined,
  }));
}

/** Add one specific, dietitian-picked grocery item (from the search bar) to an approved list —
 * the only way new candidates reach the Ratify screen. Computes its per-serving amount for the
 * list's nutrient from the grocery_items reference table; if the item has no data for that
 * nutrient, adds it anyway with amount 0 and a clear note — search is nutrient-agnostic by
 * design, so this is expected for some picks. */
export async function addGroceryItemToApprovedList(
  patientId: string,
  nutrient: string,
  groceryItemId: string,
): Promise<ApprovedList | null> {
  const gap = await prisma.nutrientGap.findUnique({
    where: { patientId_nutrient: { patientId, nutrient } },
  });
  if (!gap) return null;

  const list = await prisma.approvedList.findUnique({
    where: { patientId_nutrientGapId: { patientId, nutrientGapId: gap.id } },
  });
  if (!list) return null;

  const r = await prisma.groceryItem.findUnique({ where: { id: groceryItemId } });
  if (!r) return null;

  const col = NUTRIENT_COLUMN[nutrient as NutrientKey];
  const per100g = col ? num((r as unknown as Record<string, unknown>)[col.field] ?? 0) : 0;
  const servingG = r.servingSizeG ? num(r.servingSizeG) : 100;
  const amount = Math.round(((per100g * servingG) / 100) * 100) / 100;

  const existing = await prisma.approvedListItem.findMany({
    where: { approvedListId: list.id },
    select: { rank: true },
  });
  const maxRank = existing.reduce((m, e) => Math.max(m, e.rank), 0);
  const name = r.productName.length > 80 ? r.productName.slice(0, 77) + "…" : r.productName;

  await prisma.approvedListItem.create({
    data: {
      approvedListId: list.id,
      rank: maxRank + 1,
      foodName: name,
      fdcId: r.fdcId,
      servingDescription: r.householdServing || `${servingG}g`,
      prep: "",
      amountPerServing: amount,
      unit: gap.unit,
      icon: "ph-bowl-food",
      status: "flagged",
      note:
        amount > 0
          ? `Manually added by dietitian${r.priceUsd ? ` · $${num(r.priceUsd).toFixed(2)}` : ""} — pending review.`
          : `Manually added — no ${nutrient} data on file for this item; verify the amount before approving.`,
    },
  });

  return getApprovedList(patientId, nutrient);
}

/** The USP: patient picks a food -> recompute amount + persist an insert-only choice. */
export async function createChoice(
  patientId: string, approvedListItemId: string, gapRemaining?: number,
): Promise<ChoiceResult | null> {
  const item = await prisma.approvedListItem.findUnique({
    where: { id: approvedListItemId },
    include: { approvedList: { include: { nutrientGap: true } } },
  });
  if (!item) return null;

  const gap = item.approvedList.nutrientGap;
  const remaining = gapRemaining ?? num(gap.targetValue) - num(gap.currentValue);

  const result = computeChoice({
    foodName: item.foodName, prep: item.prep, servingDescription: item.servingDescription,
    amountPerServing: num(item.amountPerServing), approved: item.status === "approved",
    gapRemaining: remaining, gapUnit: gap.unit,
  });

  const cycle = await prisma.cycle.findFirst({ where: { patientId }, orderBy: { startDate: "desc" } });
  if (cycle) {
    await prisma.patientChoice.updateMany({
      where: { patientId, nutrientGapId: gap.id, supersededAt: null },
      data: { supersededAt: new Date() },
    });
    await prisma.patientChoice.create({
      data: {
        patientId, cycleId: cycle.id, nutrientGapId: gap.id, approvedListItemId: item.id,
        foodName: item.foodName, servingsText: result.servingsText, gapRemaining: remaining,
        gapUnit: gap.unit, gapClosedPct: result.gapClosedPct, stillApproved: result.stillApproved,
      },
    });
  }
  return result;
}

const GAUGE_ICON: Partial<Record<NutrientKey, string>> = {
  iron: "ph-drop",
  vitamin_c: "ph-orange-slice",
  magnesium: "ph-lightning",
  calcium: "ph-drop",
  potassium: "ph-lightning",
  zinc: "ph-drop",
  fiber: "ph-leaf",
  protein: "ph-bowl-food",
  folate: "ph-leaf",
  vitamin_b12: "ph-drop",
  sodium: "ph-drop",
};

/**
 * Patient dashboard gauges — intake toward target, computed from real ConsumptionEvents.
 * For each active (non-excluded) focus-set nutrient: baseline = the cycle's recorded
 * CycleOutcome.baselineValue (falls back to the gap's currentValue if no outcome row yet);
 * current = baseline + nutrient contributed by logged foods in the last 7 days. "Contributed"
 * is read from the patient's own ratified ApprovedListItem.amountPerServing for that food
 * (the same per-serving math the swap screen already computed), not recomputed from scratch —
 * a logged food only counts if it's on the ratified list for that gap.
 */
export async function computeDashboard(patientId: string): Promise<DashboardGauge[]> {
  const cycle = await prisma.cycle.findFirst({ where: { patientId, status: "active" }, orderBy: { startDate: "desc" } });
  if (!cycle) return [];

  const focusItems = await prisma.focusSetItem.findMany({
    where: { cycleId: cycle.id, version: cycle.focusSetVersion, excluded: false },
    include: { nutrientGap: true },
    orderBy: { rank: "asc" },
  });
  if (focusItems.length === 0) return [];

  const outcomes = await prisma.cycleOutcome.findMany({ where: { cycleId: cycle.id } });
  const baselineByGap = new Map(outcomes.map((o) => [o.nutrientGapId, num(o.baselineValue)]));

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const gauges: DashboardGauge[] = [];
  for (const item of focusItems) {
    const gap = item.nutrientGap;
    const baseline = baselineByGap.get(gap.id) ?? num(gap.currentValue);

    const approvedList = await prisma.approvedList.findUnique({
      where: { patientId_nutrientGapId: { patientId, nutrientGapId: gap.id } },
      include: { items: { where: { status: "approved" } } },
    });
    const amountByFdc = new Map(
      (approvedList?.items ?? [])
        .filter((i): i is typeof i & { fdcId: string } => !!i.fdcId)
        .map((i) => [i.fdcId, num(i.amountPerServing)]),
    );
    if (amountByFdc.size === 0) continue; // nothing ratified for this gap yet — no gauge to show

    const events = await prisma.consumptionEvent.findMany({
      where: { patientId, consumedDate: { gte: since }, fdcId: { in: [...amountByFdc.keys()] } },
    });
    const logged = events.reduce((sum, e) => sum + num(e.quantityServings) * (amountByFdc.get(e.fdcId!) ?? 0), 0);

    const current = Math.round((baseline + logged) * 10) / 10;
    const target = num(gap.targetValue);
    const inRange = current >= target;
    gauges.push({
      label: gap.label,
      icon: GAUGE_ICON[gap.nutrient as NutrientKey] ?? "ph-drop",
      current, target, baseline, unit: gap.unit, inRange,
      caption: inRange
        ? `Target met · up from ${baseline} ${gap.unit} at baseline · target ${target} ${gap.unit}/day`
        : `Up from ${baseline} ${gap.unit} at baseline · logged foods · target ${target} ${gap.unit}/day`,
    });
  }
  return gauges;
}

/** Quick Log's recent-entries list — most recent first. */
export async function getRecentConsumption(patientId: string, days = 14): Promise<ConsumptionEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const events = await prisma.consumptionEvent.findMany({
    where: { patientId, consumedDate: { gte: since } },
    orderBy: { consumedDate: "desc" },
  });
  return events.map((e) => ({
    id: e.id, foodName: e.foodName, quantityServings: num(e.quantityServings),
    consumedDate: e.consumedDate.toISOString(), source: e.source, flag: e.flag,
  }));
}

function serializeLineItem(li: {
  id: string; rawText: string; matchedFood: string | null; quantity: unknown; priceUsd: unknown;
  matchFlag: string; confirmed: boolean | null;
}): ReceiptLineItemEntry {
  return {
    id: li.id, rawText: li.rawText, matchedFood: li.matchedFood ?? undefined,
    quantity: li.quantity !== null ? num(li.quantity) : undefined,
    priceUsd: li.priceUsd !== null ? num(li.priceUsd) : undefined,
    matchFlag: li.matchFlag as ReceiptLineItemEntry["matchFlag"],
    confirmed: li.confirmed,
  };
}

export async function getReceipts(patientId: string): Promise<ReceiptSummary[]> {
  const receipts = await prisma.receipt.findMany({
    where: { patientId },
    include: { lineItems: true },
    orderBy: { uploadDate: "desc" },
  });
  return receipts.map((r) => ({
    id: r.id, uploadDate: r.uploadDate.toISOString(), retailer: r.retailer ?? undefined,
    parseStatus: r.parseStatus, itemCount: r.lineItems.length,
    pendingReviewCount: r.lineItems.filter((li) => li.confirmed === null).length,
  }));
}

export async function getReceiptDetail(patientId: string, receiptId: string): Promise<ReceiptDetail | null> {
  const r = await prisma.receipt.findFirst({
    where: { id: receiptId, patientId },
    include: { lineItems: { orderBy: { createdAt: "asc" } } },
  });
  if (!r) return null;
  return {
    id: r.id, uploadDate: r.uploadDate.toISOString(), retailer: r.retailer ?? undefined,
    parseStatus: r.parseStatus, lineItems: r.lineItems.map(serializeLineItem),
  };
}

/** Receipt upload -> save the image, extract line items (Claude vision), resolve each to an
 * fdcId deterministically. All line items land confirmed=null — nothing feeds the habit model
 * until the patient reviews and confirms it's actually theirs. */
export async function createReceiptFromUpload(
  patientId: string, imageBase64: string, mediaType: string,
): Promise<ReceiptDetail | null> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) return null;

  const s3Key = await saveUpload(patientId, "receipts", imageBase64, mediaType);
  const receipt = await prisma.receipt.create({ data: { patientId, s3Key, parseStatus: "pending" } });

  let parsed;
  try {
    parsed = await parseReceipt(imageBase64, mediaType);
  } catch (err) {
    console.error(`receipt parse failed (patient ${patientId}, report ${receipt.id}):`, err);
    await prisma.receipt.update({ where: { id: receipt.id }, data: { parseStatus: "failed" } });
    return getReceiptDetail(patientId, receipt.id);
  }

  for (const li of parsed.lineItems) {
    const match = li.foodNameGuess ? await matchFood(patientId, li.foodNameGuess) : { fdcId: null, matchConfidence: 0 };
    await prisma.receiptLineItem.create({
      data: {
        receiptId: receipt.id, rawText: li.rawText, matchedFood: li.foodNameGuess,
        fdcId: match.fdcId, quantity: li.quantity ?? undefined, priceUsd: li.priceUsd ?? undefined,
        matchConfidence: match.matchConfidence,
        matchFlag: li.needsReview || !match.fdcId ? "needs_review" : "ok",
        confirmed: null,
      },
    });
  }

  await prisma.receipt.update({
    where: { id: receipt.id },
    data: {
      retailer: parsed.retailer ?? undefined,
      parseStatus: parsed.lineItems.length > 0 ? "parsed" : "needs_review",
    },
  });

  return getReceiptDetail(patientId, receipt.id);
}

/** The review/confirm step: the patient marks a line item as theirs (or not — a family
 * purchase). Only confirmed=true items feed the habit model — enforced here, server-side. */
export async function confirmReceiptLineItem(
  patientId: string, receiptId: string, lineItemId: string, confirmed: boolean,
): Promise<ReceiptLineItemEntry | null> {
  const li = await prisma.receiptLineItem.findFirst({
    where: { id: lineItemId, receiptId, receipt: { patientId } },
  });
  if (!li) return null;

  const updated = await prisma.receiptLineItem.update({
    where: { id: lineItemId },
    data: { confirmed, reviewedAt: new Date() },
  });

  if (confirmed && li.matchedFood) {
    await prisma.habitModel.upsert({
      where: { patientId_foodName: { patientId, foodName: li.matchedFood } },
      create: {
        patientId, foodName: li.matchedFood, fdcId: li.fdcId,
        freqPerWeek: 1, lastSeenDate: new Date(), source: "receipt",
      },
      update: {
        freqPerWeek: { increment: 1 }, lastSeenDate: new Date(), source: "receipt",
        ...(li.fdcId ? { fdcId: li.fdcId } : {}),
      },
    });
  }

  return serializeLineItem(updated);
}

// Standard adult daily targets, one per tracked nutrient — same unit convention already used
// throughout this app's seeded NutrientGaps (see prisma/seed.ts), including vitamin_d's
// blood-serum ng/mL convention (Patient.labs is itself documented as a simplified,
// display-only stand-in for a full lab_reports/lab_analytes model — this mirrors that same
// level of fidelity, not a new corner cut).
const RDA_TARGETS: Record<NutrientKey, number> = {
  iron: 18, vitamin_c: 90, magnesium: 420, calcium: 1200, potassium: 3500, zinc: 11,
  fiber: 28, protein: 50, folate: 400, vitamin_d: 30, vitamin_b12: 2.4, sodium: 2300,
};

function serializeLabFinding(f: {
  id: string; nutrient: string; label: string; currentValue: unknown; unit: string; confirmed: boolean | null;
}): LabReportFindingEntry {
  return {
    id: f.id, nutrient: f.nutrient as NutrientKey, label: f.label,
    currentValue: num(f.currentValue), unit: f.unit, confirmed: f.confirmed,
  };
}

export async function getLabReports(patientId: string): Promise<LabReportSummary[]> {
  const reports = await prisma.labReport.findMany({
    where: { patientId },
    include: { findings: true },
    orderBy: { uploadDate: "desc" },
  });
  return reports.map((r) => ({
    id: r.id, uploadDate: r.uploadDate.toISOString(), parseStatus: r.parseStatus,
    findingCount: r.findings.length,
    pendingReviewCount: r.findings.filter((f) => f.confirmed === null).length,
  }));
}

export async function getLabReportDetail(patientId: string, labReportId: string): Promise<LabReportDetail | null> {
  const r = await prisma.labReport.findFirst({
    where: { id: labReportId, patientId },
    include: { findings: { orderBy: { createdAt: "asc" } } },
  });
  if (!r) return null;
  return {
    id: r.id, uploadDate: r.uploadDate.toISOString(), parseStatus: r.parseStatus,
    findings: r.findings.map(serializeLabFinding),
  };
}

/** Lab report upload — "Agent 1", the Health Report Analyzer: save the image, extract
 * analyte findings (Claude vision), constrained to the 12 tracked nutrients. All findings land
 * confirmed=null — nothing becomes a real NutrientGap until the dietitian reviews it. Mirrors
 * createReceiptFromUpload exactly. */
export async function createLabReportFromUpload(
  patientId: string, imageBase64: string, mediaType: string,
): Promise<LabReportDetail | null> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) return null;

  const s3Key = await saveUpload(patientId, "lab-reports", imageBase64, mediaType);
  const report = await prisma.labReport.create({ data: { patientId, s3Key, parseStatus: "pending" } });

  let parsed;
  try {
    parsed = await parseLabReport(imageBase64, mediaType);
  } catch (err) {
    console.error(`lab report parse failed (patient ${patientId}, report ${report.id}):`, err);
    await prisma.labReport.update({ where: { id: report.id }, data: { parseStatus: "failed" } });
    return getLabReportDetail(patientId, report.id);
  }

  if (parsed.findings.length > 0) {
    await prisma.labReportFinding.createMany({
      data: parsed.findings.map((f) => ({
        labReportId: report.id, nutrient: f.nutrient, label: f.label,
        currentValue: f.currentValue, unit: f.unit, confirmed: null,
      })),
    });
  }

  await prisma.labReport.update({ where: { id: report.id }, data: { parseStatus: "parsed" } });
  return getLabReportDetail(patientId, report.id);
}

/** The review/confirm step — the dietitian's human gate on Agent 1's output. Confirming a
 * finding computes its target (RDA_TARGETS) and severity deterministically (never trusted to
 * the model), then upserts a real NutrientGap — which immediately becomes available in the
 * already-built "Add focus item" picker (getAvailableNutrientGaps / FocusSetBoard.tsx). */
export async function confirmLabFinding(
  patientId: string, labReportId: string, findingId: string, confirmed: boolean,
): Promise<LabReportFindingEntry | null> {
  const f = await prisma.labReportFinding.findFirst({
    where: { id: findingId, labReportId, labReport: { patientId } },
  });
  if (!f) return null;

  const updated = await prisma.labReportFinding.update({
    where: { id: findingId },
    data: { confirmed, reviewedAt: new Date() },
  });

  if (confirmed) {
    const nutrient = f.nutrient as NutrientKey;
    const currentValue = num(f.currentValue);
    const targetValue = RDA_TARGETS[nutrient];
    const ratio = targetValue > 0 ? currentValue / targetValue : 1;
    const severity: Severity = ratio < 0.5 ? "severe" : ratio < 0.8 ? "moderate" : "mild";

    await prisma.nutrientGap.upsert({
      where: { patientId_nutrient: { patientId, nutrient } },
      create: {
        patientId, nutrient, label: f.label || NUTRIENT_INFO[nutrient].label,
        currentValue, targetValue, unit: f.unit, severity, isActive: true,
      },
      update: { currentValue, targetValue, unit: f.unit, severity, isActive: true },
    });
  }

  return serializeLabFinding(updated);
}

/** Weight check-ins — clinical monitoring (fluid retention flags for chronic conditions),
 * never a weight-loss target. Logged from /me/profile, also shown read-only on Progress. */
export async function getWeightCheckIns(patientId: string, weeks = 4): Promise<WeightCheckInEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const rows = await prisma.weightCheckIn.findMany({
    where: { patientId, checkedInAt: { gte: since } },
    orderBy: { checkedInAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id, weightLb: num(r.weightLb), checkedInAt: r.checkedInAt.toISOString(), note: r.note ?? undefined,
  }));
}

export async function addWeightCheckIn(patientId: string, weightLb: number, note?: string): Promise<WeightCheckInEntry | null> {
  const exists = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!exists) return null;
  const row = await prisma.weightCheckIn.create({ data: { patientId, weightLb, note } });
  return { id: row.id, weightLb: num(row.weightLb), checkedInAt: row.checkedInAt.toISOString(), note: row.note ?? undefined };
}

/** Progress per deficiency across every 3-month cycle the patient has been through —
 * grouped by nutrient, each cycle's baseline vs. retest (or "not retested yet" if current). */
export async function getCycleHistory(patientId: string): Promise<NutrientHistory[]> {
  const cycles = await prisma.cycle.findMany({ where: { patientId }, orderBy: { startDate: "asc" } });
  if (cycles.length === 0) return [];

  const outcomes = await prisma.cycleOutcome.findMany({
    where: { cycleId: { in: cycles.map((c) => c.id) } },
    include: { nutrientGap: true },
  });

  const cycleById = new Map(cycles.map((c) => [c.id, c]));
  const byNutrient = new Map<string, NutrientHistory>();

  for (const o of outcomes) {
    const cycle = cycleById.get(o.cycleId);
    if (!cycle) continue;
    const gap = o.nutrientGap;
    let entry = byNutrient.get(gap.nutrient);
    if (!entry) {
      entry = { nutrient: gap.nutrient as NutrientHistory["nutrient"], label: gap.label, unit: gap.unit, targetValue: num(gap.targetValue), cycles: [] };
      byNutrient.set(gap.nutrient, entry);
    }
    entry.cycles.push({
      cycleId: cycle.id, cycleSlug: cycle.cycleSlug ?? undefined, startDate: cycle.startDate.toISOString(),
      baselineValue: num(o.baselineValue),
      retestValue: o.retestValue !== null ? num(o.retestValue) : undefined,
      delta: o.delta !== null ? num(o.delta) : undefined,
      improved: o.improved ?? undefined,
      outcomeStatus: o.outcomeStatus,
    });
  }

  for (const entry of byNutrient.values()) {
    entry.cycles.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }
  return [...byNutrient.values()];
}

/** Secure two-way thread — one per patient (they have one assigned dietitian; matches the
 * existing single-dietitian-FK simplification, no Conversation wrapper needed). */
export async function getMessages(patientId: string): Promise<MessageEntry[]> {
  const rows = await prisma.message.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } });
  return rows.map((m) => ({
    id: m.id, senderRole: m.senderRole, body: m.body,
    createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString(),
  }));
}

export async function sendMessage(patientId: string, senderRole: "patient" | "dietitian", body: string): Promise<MessageEntry | null> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { dietitianId: true } });
  if (!patient?.dietitianId) return null;
  const row = await prisma.message.create({ data: { patientId, dietitianId: patient.dietitianId, senderRole, body } });
  return { id: row.id, senderRole: row.senderRole, body: row.body, createdAt: row.createdAt.toISOString(), readAt: row.readAt?.toISOString() };
}

/** Marks the patient's messages as read — called when the dietitian opens the thread. */
export async function markMessagesRead(patientId: string): Promise<void> {
  await prisma.message.updateMany({ where: { patientId, senderRole: "patient", readAt: null }, data: { readAt: new Date() } });
}

/** Dietitian inbox — every patient with an active thread, most recent message first. */
export async function listMessageThreads(): Promise<MessageThreadSummary[]> {
  const patients = await prisma.patient.findMany({
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const withThreads = patients.filter((p) => p.messages.length > 0);
  const threads = await Promise.all(
    withThreads.map(async (p) => {
      const unreadCount = await prisma.message.count({ where: { patientId: p.id, senderRole: "patient", readAt: null } });
      const last = p.messages[0];
      return {
        patientId: p.id, patientName: p.name,
        lastMessage: last.body, lastMessageAt: last.createdAt.toISOString(), unreadCount,
      };
    }),
  );
  return threads.sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime());
}
