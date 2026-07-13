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
    bmi: num(p.bmi), bpSystolic: p.bpSystolic ?? 0, bpDiastolic: p.bpDiastolic ?? 0,
    dietitianName: p.dietitian?.name ?? "",
    labs: (p.labs as Patient["labs"]) ?? [],
  };
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
    items: list.items
      .filter((it) => it.removedAt === null)
      .map((it) => ({
        id: it.id, foodName: it.foodName, fdcId: it.fdcId ?? undefined,
        servingDescription: it.servingDescription, prep: it.prep,
        amountPerServing: num(it.amountPerServing), unit: it.unit, icon: it.icon,
        status: it.status, note: it.note, edited: it.edited || undefined,
      })),
  };
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
