/**
 * Server-side data access (Prisma). Single source of truth used BOTH by:
 *  - server components (pages call these directly — no HTTP hop), and
 *  - the /api route handlers (which wrap these for the client + external callers).
 * Never import this from a client component — it uses Prisma.
 */
import { prisma, num } from "./db";
import { computeChoice } from "./recompute";
import type {
  Patient, FocusItem, ApprovedList, ChoiceResult, DashboardGauge, NutrientGap, NutrientKey, Severity,
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

export async function listPatients() {
  const ps = await prisma.patient.findMany({ include: { dietitian: true }, orderBy: { name: "asc" } });
  return ps.map((p) => ({
    id: p.id, name: p.name, age: p.age, conditions: p.conditions,
    dietitianName: p.dietitian?.name ?? "",
  }));
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
  };
}

/** Dietary preferences: restrictions, dislikes, weekly grocery budget — clinician/patient-entered. */
export async function setDietaryPreferences(
  patientId: string,
  prefs: { restrictions?: string[]; dislikes?: string[]; weeklyBudgetUsd?: number },
): Promise<Patient | null> {
  const exists = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!exists) return null;
  await prisma.patient.update({
    where: { id: patientId },
    data: {
      ...(prefs.restrictions !== undefined && { restrictions: prefs.restrictions }),
      ...(prefs.dislikes !== undefined && { dislikes: prefs.dislikes }),
      ...(prefs.weeklyBudgetUsd !== undefined && { weeklyBudgetUsd: prefs.weeklyBudgetUsd }),
    },
  });
  return getPatient(patientId);
}

/** The seeded demo patient (Sam) — for pages that aren't yet routed by patient id. */
export async function getDemoPatient(): Promise<Patient | null> {
  const first = await prisma.patient.findFirst({ orderBy: { createdAt: "asc" } });
  return first ? getPatient(first.id) : null;
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
 * an approved one (hides it from both ratify and patient views), or edit its note. */
export async function updateApprovedListItem(
  itemId: string,
  action: "approve" | "restore" | "remove" | "edit",
  note?: string,
): Promise<ApprovedList["items"][number] | null> {
  const item = await prisma.approvedListItem.findUnique({ where: { id: itemId } });
  if (!item) return null;

  const updated = await prisma.approvedListItem.update({
    where: { id: itemId },
    data: {
      ...((action === "approve" || action === "restore") && { status: "approved" as const }),
      ...(action === "remove" && { removedAt: new Date() }),
      ...(action === "edit" && { edited: true, ...(note !== undefined && { note }) }),
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

/**
 * "Add candidate" — sources new draft items for an existing approved list straight from the real
 * grocery_items reference table (8,986-row Walmart x USDA join), ranked by gap-closing efficiency
 * (nutrient per serving). Filters out the patient's dislikes and, for vegetarian/vegan restrictions,
 * the Meat & Seafood department. New rows land as "flagged" — the dietitian still reviews before a
 * patient ever sees them, same as any other candidate on this screen.
 */
export async function generateCandidatesFromGrocery(
  patientId: string,
  nutrient: string,
  limit = 5,
): Promise<ApprovedList | null> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return null;

  const gap = await prisma.nutrientGap.findUnique({
    where: { patientId_nutrient: { patientId, nutrient } },
  });
  if (!gap) return null;

  const list = await prisma.approvedList.findUnique({
    where: { patientId_nutrientGapId: { patientId, nutrientGapId: gap.id } },
  });
  if (!list) return null;

  const col = NUTRIENT_COLUMN[nutrient as NutrientKey];
  if (!col) return getApprovedList(patientId, nutrient); // unsupported nutrient — no-op

  const existing = await prisma.approvedListItem.findMany({
    where: { approvedListId: list.id },
    select: { fdcId: true, rank: true },
  });
  const seenFdc = new Set(existing.map((e) => e.fdcId).filter((v): v is string => !!v));
  const maxRank = existing.reduce((m, e) => Math.max(m, e.rank), 0);

  const excludeMeat = patient.restrictions.some((r) => /vegetarian|vegan/i.test(r));
  const dislikes = patient.dislikes.map((d) => d.toLowerCase());

  const rows = await prisma.groceryItem.findMany({
    where: {
      [col.field]: { gt: 0, lte: col.cap },
      ...(excludeMeat && { department: { not: "Meat & Seafood" } }),
    },
    orderBy: { [col.field]: "desc" },
    take: limit * 8, // overfetch — post-filtered below by dupes/dislikes
  });

  const picked = rows
    .filter((r) => !seenFdc.has(r.fdcId))
    .filter((r) => !dislikes.some((d) => r.productName.toLowerCase().includes(d)))
    .slice(0, limit);

  if (picked.length > 0) {
    await prisma.approvedListItem.createMany({
      data: picked.map((r, i) => {
        const per100g = num((r as unknown as Record<string, unknown>)[col.field]);
        const servingG = r.servingSizeG ? num(r.servingSizeG) : 100;
        const amount = Math.round((per100g * servingG) / 100 * 100) / 100;
        const name = r.productName.length > 80 ? r.productName.slice(0, 77) + "…" : r.productName;
        return {
          approvedListId: list.id,
          rank: maxRank + i + 1,
          foodName: name,
          fdcId: r.fdcId,
          servingDescription: r.householdServing || `${servingG}g`,
          prep: "",
          amountPerServing: amount,
          unit: gap.unit,
          icon: "ph-bowl-food",
          status: "flagged" as const,
          note: `Sourced from Walmart×USDA data${r.priceUsd ? ` · $${num(r.priceUsd).toFixed(2)}` : ""} — pending dietitian review.`,
        };
      }),
    });
  }

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

/**
 * Patient dashboard gauges — intake toward target from logged foods.
 * Placeholder until consumption_events land (a later increment); values match the demo story.
 */
export function getDashboard(): DashboardGauge[] {
  return [
    { label: "Iron", icon: "ph-drop", current: 15, target: 18, baseline: 9, unit: "mg", inRange: false, caption: "Up from 9 mg at baseline · logged foods · target 18 mg/day" },
    { label: "Vitamin C", icon: "ph-orange-slice", current: 92, target: 90, baseline: 40, unit: "mg", inRange: true, caption: "Target met 3 days running · up from 40 mg at baseline · target 90 mg/day" },
    { label: "Magnesium", icon: "ph-lightning", current: 350, target: 420, baseline: 300, unit: "mg", inRange: false, caption: "Up from 300 mg at baseline · logged foods · target 420 mg/day" },
  ];
}
