/**
 * Seed — patient Sam Rivera, dietitian Maria, RD. Same data the frontend mock uses
 * (frontend/lib/mock.ts), so the wired app matches the standalone FE exactly.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

// Demo login for the seeded dietitian — the account has no password until this runs, so the
// login wall would otherwise lock everyone out of the only seeded dietitian. Required from the
// environment rather than hardcoded here, same as every other secret in this repo (e.g.
// ANTHROPIC_API_KEY) — set DEMO_DIETITIAN_PASSWORD in .env locally.
export const DEMO_DIETITIAN_EMAIL = "maria@metronutrition.example";
export const DEMO_DIETITIAN_PASSWORD = process.env.DEMO_DIETITIAN_PASSWORD;
if (!DEMO_DIETITIAN_PASSWORD) {
  throw new Error("DEMO_DIETITIAN_PASSWORD is not set — add it to .env before running the seed.");
}

// --- Caseload filler patients ----------------------------------------------------
// Sam is the fully-worked demo patient (receipts, logs, messages, invite, cycle history —
// all of /me/*). These four are lighter: enough for the dietitian caseload (/rx, /rx/prioritize,
// /rx/ratify) to feel like a real multi-patient practice, not a single-patient demo.
type GapSpec = {
  nutrient: string; label: string; current: number; target: number; unit: string;
  severity: "severe" | "moderate" | "mild"; why: string; excluded?: boolean; excludeReason?: string;
};
type ApprovedItemSpec = {
  foodName: string; servingDescription: string; prep: string; amountPerServing: number;
  unit: string; icon: string; status: "approved" | "flagged" | "excluded"; note: string;
};

async function seedCaseloadPatient(opts: {
  practiceId: string; dietitianId: string; name: string; age: number; conditions: string[];
  restrictions: string[]; dislikes: string[]; weeklyBudgetUsd: number; bmi: number;
  bpSystolic: number; bpDiastolic: number;
  labs: { name: string; value: string; flag: string }[];
  cycleSlug: string;
  gaps: GapSpec[];
  approvedLists: Record<string, ApprovedItemSpec[]>;
}) {
  const patient = await prisma.patient.create({
    data: {
      practiceId: opts.practiceId, dietitianId: opts.dietitianId, name: opts.name, age: opts.age,
      conditions: opts.conditions, restrictions: opts.restrictions, dislikes: opts.dislikes,
      weeklyBudgetUsd: opts.weeklyBudgetUsd, bmi: opts.bmi,
      bpSystolic: opts.bpSystolic, bpDiastolic: opts.bpDiastolic,
      labs: opts.labs, enrolledAt: new Date("2026-04-02"),
    },
  });

  const gapByNutrient: Record<string, string> = {};
  for (const g of opts.gaps) {
    const gap = await prisma.nutrientGap.create({
      data: {
        patientId: patient.id, nutrient: g.nutrient, label: g.label,
        currentValue: g.current, targetValue: g.target, unit: g.unit, severity: g.severity,
      },
    });
    gapByNutrient[g.nutrient] = gap.id;
  }

  const cycle = await prisma.cycle.create({
    data: {
      patientId: patient.id, cycleSlug: opts.cycleSlug,
      startDate: new Date("2026-04-02"), retestDueDate: new Date("2026-07-02"),
      status: "active", focusSetVersion: 0,
    },
  });

  await prisma.focusSetItem.createMany({
    data: opts.gaps.map((g, i) => ({
      cycleId: cycle.id, nutrientGapId: gapByNutrient[g.nutrient], version: 0, rank: i + 1,
      why: g.why, excluded: g.excluded ?? false, excludeReason: g.excludeReason,
    })),
  });

  for (const [nutrient, items] of Object.entries(opts.approvedLists)) {
    const list = await prisma.approvedList.create({
      data: {
        patientId: patient.id, nutrientGapId: gapByNutrient[nutrient],
        status: "ratified", ratifiedBy: "Maria, RD", ratifiedAt: new Date(),
      },
    });
    await prisma.approvedListItem.createMany({
      data: items.map((it, i) => ({ approvedListId: list.id, rank: i + 1, ...it })),
    });
  }

  return patient;
}

async function main() {
  // clean (dependency order) for idempotent re-seeding
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.patientInvite.deleteMany();
  await prisma.message.deleteMany();
  await prisma.weightCheckIn.deleteMany();
  await prisma.consumptionEvent.deleteMany();
  await prisma.receiptLineItem.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.labReportFinding.deleteMany();
  await prisma.labReport.deleteMany();
  await prisma.habitModel.deleteMany();
  await prisma.cycleOutcome.deleteMany();
  await prisma.patientChoice.deleteMany();
  await prisma.approvedListItem.deleteMany();
  await prisma.approvedList.deleteMany();
  await prisma.focusSetItem.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.nutrientGap.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.dietitian.deleteMany();
  await prisma.practice.deleteMany();

  const practice = await prisma.practice.create({ data: { name: "Metro Nutrition Clinic" } });

  const maria = await prisma.dietitian.create({
    data: { practiceId: practice.id, name: "Maria, RD", credential: "RD", email: DEMO_DIETITIAN_EMAIL },
  });
  await prisma.user.create({
    data: {
      email: DEMO_DIETITIAN_EMAIL,
      passwordHash: await hashPassword(DEMO_DIETITIAN_PASSWORD),
      role: "dietitian",
      dietitianId: maria.id,
    },
  });

  const sam = await prisma.patient.create({
    data: {
      practiceId: practice.id,
      dietitianId: maria.id,
      name: "Sam Rivera",
      age: 54,
      conditions: ["Type 2 diabetes", "Cardiac history"],
      restrictions: ["vegetarian"],
      dislikes: ["mushrooms"],
      weeklyBudgetUsd: 40.0,
      bmi: 30.3,
      bpSystolic: 138,
      bpDiastolic: 88,
      labs: [
        { name: "HbA1c", value: "7.2%", flag: "High" },
        { name: "LDL", value: "151 mg/dL", flag: "High" },
        { name: "HDL", value: "34 mg/dL", flag: "Low" },
        { name: "Triglycerides", value: "210 mg/dL", flag: "High" },
        { name: "Vitamin D", value: "18 ng/mL", flag: "Low" },
      ],
      enrolledAt: new Date("2026-04-02"),
    },
  });

  const iron = await prisma.nutrientGap.create({
    data: { patientId: sam.id, nutrient: "iron", label: "Iron (Fe)", currentValue: 9, targetValue: 18, unit: "mg", severity: "severe" },
  });
  const vitc = await prisma.nutrientGap.create({
    data: { patientId: sam.id, nutrient: "vitamin_c", label: "Vitamin C", currentValue: 40, targetValue: 90, unit: "mg", severity: "moderate" },
  });
  const mag = await prisma.nutrientGap.create({
    data: { patientId: sam.id, nutrient: "magnesium", label: "Magnesium", currentValue: 300, targetValue: 420, unit: "mg", severity: "moderate" },
  });
  const vitd = await prisma.nutrientGap.create({
    data: { patientId: sam.id, nutrient: "vitamin_d", label: "Vitamin D", currentValue: 18, targetValue: 30, unit: "ng/mL", severity: "severe" },
  });

  // Prior, closed cycle — makes the cycle-history view demoable with real baseline→retest
  // continuity (Q1's retest values equal Q2's NutrientGap.currentValue above).
  const q1Cycle = await prisma.cycle.create({
    data: {
      patientId: sam.id,
      cycleSlug: "sam-2026q1",
      startDate: new Date("2026-01-02"),
      retestDueDate: new Date("2026-04-02"),
      status: "completed",
      focusSetVersion: 0,
    },
  });

  const cycle = await prisma.cycle.create({
    data: {
      patientId: sam.id,
      cycleSlug: "sam-2026q2",
      startDate: new Date("2026-04-02"),
      retestDueDate: new Date("2026-07-02"),
      status: "active",
      focusSetVersion: 0,
      previousCycleId: q1Cycle.id,
    },
  });

  // Q1 outcomes: closed cycle, both baseline+retest set. Retest values match Q2's
  // NutrientGap.currentValue above — continuity across cycles.
  await prisma.cycleOutcome.createMany({
    data: [
      { cycleId: q1Cycle.id, nutrientGapId: iron.id, baselineValue: 6, retestValue: 9, delta: 3, improved: true, outcomeStatus: "carried_forward", adherencePct: 62, adherenceClassification: "partial", computedAt: new Date("2026-04-02") },
      { cycleId: q1Cycle.id, nutrientGapId: vitc.id, baselineValue: 25, retestValue: 40, delta: 15, improved: true, outcomeStatus: "carried_forward", adherencePct: 55, adherenceClassification: "partial", computedAt: new Date("2026-04-02") },
      { cycleId: q1Cycle.id, nutrientGapId: mag.id, baselineValue: 260, retestValue: 300, delta: 40, improved: true, outcomeStatus: "carried_forward", adherencePct: 48, adherenceClassification: "partial", computedAt: new Date("2026-04-02") },
    ],
  });

  // Q2 outcomes: current cycle, in progress — retest not yet taken.
  await prisma.cycleOutcome.createMany({
    data: [
      { cycleId: cycle.id, nutrientGapId: iron.id, baselineValue: 9, retestValue: null, outcomeStatus: "in_progress" },
      { cycleId: cycle.id, nutrientGapId: vitc.id, baselineValue: 40, retestValue: null, outcomeStatus: "in_progress" },
      { cycleId: cycle.id, nutrientGapId: mag.id, baselineValue: 300, retestValue: null, outcomeStatus: "in_progress" },
    ],
  });

  await prisma.focusSetItem.createMany({
    data: [
      { cycleId: cycle.id, nutrientGapId: iron.id, version: 0, rank: 1, why: "Sustained low intake across the 14-day log; patient reports fatigue.", pairWith: "vitamin C", conflictsWith: "calcium supplements, tea/coffee within 1 h of meals" },
      { cycleId: cycle.id, nutrientGapId: vitc.id, version: 0, rank: 2, why: "Produce intake low; sequenced with iron to drive absorption.", pairWith: "iron (#1)" },
      { cycleId: cycle.id, nutrientGapId: mag.id, version: 0, rank: 3, why: "Adjunct for BP management (138/88); intake below RDA." },
      { cycleId: cycle.id, nutrientGapId: vitd.id, version: 0, rank: 4, why: "18 ng/mL (deficient). Dietary sources cannot close this gap; refer to MD for supplementation.", excluded: true, excludeReason: "Not food-first — excluded from the focus set." },
    ],
  });

  const ironList = await prisma.approvedList.create({
    data: {
      patientId: sam.id,
      nutrientGapId: iron.id,
      status: "ratified",
      ratifiedBy: "Maria, RD",
      ratifiedAt: new Date(),
    },
  });

  await prisma.approvedListItem.createMany({
    data: [
      { approvedListId: ironList.id, rank: 1, foodName: "Lentils", fdcId: "172420", servingDescription: "1 cup", prep: "cooked", amountPerServing: 6.6, unit: "mg", icon: "ph-bowl-food", status: "approved", note: "High fiber slows glucose response — fits Type 2." },
      { approvedListId: ironList.id, rank: 2, foodName: "Spinach", fdcId: "168462", servingDescription: "1 cup", prep: "cooked", amountPerServing: 3.6, unit: "mg", icon: "ph-leaf", status: "approved", note: "Pair with a vitamin C source for absorption." },
      { approvedListId: ironList.id, rank: 3, foodName: "Chickpeas", fdcId: "173801", servingDescription: "1 cup", prep: "cooked", amountPerServing: 4.7, unit: "mg", icon: "ph-circles-three", status: "approved", note: "Also ~78 mg magnesium/cup toward focus #3." },
      { approvedListId: ironList.id, rank: 4, foodName: "White beans", fdcId: "175204", servingDescription: "1 cup", prep: "canned, rinsed", amountPerServing: 7.8, unit: "mg", icon: "ph-drop", status: "approved", edited: true, note: "Edit applied: low-sodium only, rinse before use (BP 138/88)." },
      { approvedListId: ironList.id, rank: 5, foodName: "Firm tofu", fdcId: "172476", servingDescription: "1 cup", prep: "cubed", amountPerServing: 6.8, unit: "mg", icon: "ph-cube", status: "approved", note: "Lean protein swap displacing saturated-fat sources." },
      { approvedListId: ironList.id, rank: 6, foodName: "Pumpkin seeds", fdcId: "170556", servingDescription: "¼ cup", prep: "unsalted", amountPerServing: 2.3, unit: "mg", icon: "ph-plant", status: "approved", note: "Snack-sized top-up for magnesium days too." },
      { approvedListId: ironList.id, rank: 7, foodName: "Fortified breakfast cereal", servingDescription: "1 serving", prep: "", amountPerServing: 18, unit: "mg", icon: "ph-bowl-food", status: "flagged", note: "~18 mg/serving but 12 g added sugar — conflicts with Type 2 screen. Suggested edit: unsweetened fortified bran variant." },
      { approvedListId: ironList.id, rank: 8, foodName: "Beef liver", servingDescription: "3 oz", prep: "", amountPerServing: 5.6, unit: "mg", icon: "ph-hamburger", status: "excluded", note: "330 mg cholesterol — fails cardiac screen (LDL 151). Auto-excluded; not shown to patient." },
    ],
  });

  const magList = await prisma.approvedList.create({
    data: { patientId: sam.id, nutrientGapId: mag.id, status: "ratified", ratifiedBy: "Maria, RD", ratifiedAt: new Date() },
  });
  await prisma.approvedListItem.createMany({
    data: [
      { approvedListId: magList.id, rank: 1, foodName: "Black beans", fdcId: "175199", servingDescription: "1 cup", prep: "cooked", amountPerServing: 120, unit: "mg", icon: "ph-circles-three", status: "approved", note: "Fiber-forward — fits Type 2 glycemic goals; closes the full 120 mg gap in one serving." },
      { approvedListId: magList.id, rank: 2, foodName: "Almonds", fdcId: "170567", servingDescription: "1 oz (~23 almonds)", prep: "unsalted", amountPerServing: 80, unit: "mg", icon: "ph-plant", status: "approved", note: "Adjunct for BP management (138/88) — magnesium supports vascular tone." },
      { approvedListId: magList.id, rank: 3, foodName: "Avocado", fdcId: "171705", servingDescription: "1 cup", prep: "", amountPerServing: 58, unit: "mg", icon: "ph-drop", status: "approved", note: "Heart-healthy monounsaturated fat — supports cardiac history." },
      { approvedListId: magList.id, rank: 4, foodName: "Brown rice", fdcId: "169704", servingDescription: "1 cup", prep: "cooked", amountPerServing: 86, unit: "mg", icon: "ph-bowl-food", status: "approved", note: "Swap for the white rice already in Sam's habit model — minimal disruption." },
      { approvedListId: magList.id, rank: 5, foodName: "Dark chocolate, 85% cacao", servingDescription: "1 oz", prep: "", amountPerServing: 65, unit: "mg", icon: "ph-cube", status: "flagged", note: "~3 g added sugar per serving — flagged for Type 2 review; suggest unsweetened cacao nibs instead." },
    ],
  });

  const vitcList = await prisma.approvedList.create({
    data: { patientId: sam.id, nutrientGapId: vitc.id, status: "ratified", ratifiedBy: "Maria, RD", ratifiedAt: new Date() },
  });
  await prisma.approvedListItem.createMany({
    data: [
      { approvedListId: vitcList.id, rank: 1, foodName: "Bell pepper", fdcId: "170108", servingDescription: "1 medium", prep: "raw", amountPerServing: 95, unit: "mg", icon: "ph-orange-slice", status: "approved", note: "Also boosts iron absorption when paired with an iron source — priority #1 synergy." },
      { approvedListId: vitcList.id, rank: 2, foodName: "Orange", fdcId: "169097", servingDescription: "1 medium", prep: "", amountPerServing: 70, unit: "mg", icon: "ph-orange-slice", status: "approved", note: "Easy grab-and-go — fits current habits (bananas already in rotation)." },
      { approvedListId: vitcList.id, rank: 3, foodName: "Broccoli", fdcId: "170379", servingDescription: "1 cup", prep: "cooked", amountPerServing: 81, unit: "mg", icon: "ph-leaf", status: "approved", note: "Also fiber and modest magnesium — supports Type 2 + BP goals." },
      { approvedListId: vitcList.id, rank: 4, foodName: "Strawberries", fdcId: "167762", servingDescription: "1 cup", prep: "", amountPerServing: 89, unit: "mg", icon: "ph-orange-slice", status: "approved", note: "Low glycemic index fruit — safe for Type 2." },
      { approvedListId: vitcList.id, rank: 5, foodName: "Kiwi", fdcId: "168153", servingDescription: "2 medium", prep: "", amountPerServing: 128, unit: "mg", icon: "ph-circles-three", status: "flagged", note: "High vitamin C, but check cost/availability with Sam before approving." },
    ],
  });

  // Habit model — purchase-side signal. Makes two existing approved-list-item notes
  // ("Swap for the white rice already in Sam's habit model", "bananas already in rotation")
  // literally backed by real rows for the first time.
  await prisma.habitModel.createMany({
    data: [
      { patientId: sam.id, foodName: "White rice", freqPerWeek: 4, lastSeenDate: new Date("2026-08-05"), source: "manual" },
      { patientId: sam.id, foodName: "Bananas", freqPerWeek: 5, lastSeenDate: new Date("2026-08-06"), source: "manual" },
    ],
  });

  // ~9 days of consumption events, mixing text/photo. Deliberately keeps iron and magnesium
  // under target (still trending) while vitamin C clears target — same "1 met, 2 trending"
  // story the old hardcoded dashboard told, but now computed for real from these rows.
  // Days 1-7 fall inside computeDashboard's rolling 7-day window; 8-9 are history-only
  // (visible in Quick Log's recent list, don't affect the gauges).
  const day = (n: number) => new Date(new Date("2026-08-08").getTime() - n * 86400000);
  await prisma.consumptionEvent.createMany({
    data: [
      { patientId: sam.id, foodName: "Lentils", fdcId: "172420", quantityServings: 1, consumedDate: day(1), source: "photo", confidenceTier: 1, flag: "ok" },
      { patientId: sam.id, foodName: "Bell pepper", fdcId: "170108", quantityServings: 1, consumedDate: day(2), source: "photo", confidenceTier: 1, flag: "ok" },
      { patientId: sam.id, foodName: "Almonds", fdcId: "170567", quantityServings: 1, consumedDate: day(3), source: "text", confidenceTier: 3, flag: "ok" },
      { patientId: sam.id, foodName: "Orange", fdcId: "169097", quantityServings: 1, consumedDate: day(4), source: "text", confidenceTier: 3, flag: "ok" },
      { patientId: sam.id, foodName: "mystery casserole", quantityServings: 1, consumedDate: day(5), source: "text", confidenceTier: 3, flag: "needs_review" },
      { patientId: sam.id, foodName: "Broccoli", fdcId: "170379", quantityServings: 1, consumedDate: day(6), source: "photo", confidenceTier: 1, flag: "ok" },
      { patientId: sam.id, foodName: "Grilled chicken breast", quantityServings: 1, consumedDate: day(7), source: "text", confidenceTier: 3, flag: "ok" },
      { patientId: sam.id, foodName: "Black beans", fdcId: "175199", quantityServings: 1, consumedDate: day(8), source: "photo", confidenceTier: 1, flag: "ok" },
      { patientId: sam.id, foodName: "Spinach", fdcId: "168462", quantityServings: 1, consumedDate: day(9), source: "text", confidenceTier: 3, flag: "ok" },
    ],
  });

  // Weekly weight check-ins — mild downward trend, for the Profile/Progress mini chart.
  await prisma.weightCheckIn.createMany({
    data: [
      { patientId: sam.id, weightLb: 191, checkedInAt: new Date("2026-07-11") },
      { patientId: sam.id, weightLb: 190, checkedInAt: new Date("2026-07-18") },
      { patientId: sam.id, weightLb: 189, checkedInAt: new Date("2026-07-25") },
      { patientId: sam.id, weightLb: 188, checkedInAt: new Date("2026-08-01") },
      { patientId: sam.id, weightLb: 187, checkedInAt: new Date("2026-08-08") },
    ],
  });

  // Receipts: one parsed (with the review/confirm states the feature needs to demo —
  // confirmed, excluded "not mine", and still-pending), one failed (retry-state UI).
  const parsedReceipt = await prisma.receipt.create({
    data: {
      patientId: sam.id,
      uploadDate: new Date("2026-08-06"),
      purchasedAt: new Date("2026-08-05"),
      retailer: "Walmart",
      s3Key: "sam-rivera/receipts/walmart-2026-08-05.jpg",
      parseStatus: "parsed",
    },
  });
  await prisma.receiptLineItem.createMany({
    data: [
      { receiptId: parsedReceipt.id, rawText: "LENTILS DRY 1LB", matchedFood: "Lentils", fdcId: "172420", quantity: 1, priceUsd: 1.98, matchConfidence: 0.94, matchFlag: "ok", confirmed: true, reviewedAt: new Date("2026-08-06") },
      { receiptId: parsedReceipt.id, rawText: "GRN BELL PEPPER EA", matchedFood: "Bell pepper", fdcId: "170108", quantity: 3, priceUsd: 1.77, matchConfidence: 0.91, matchFlag: "ok", confirmed: true, reviewedAt: new Date("2026-08-06") },
      // "not mine" — literalizes the family-purchase exclusion requirement.
      { receiptId: parsedReceipt.id, rawText: "FROOT LOOPS CEREAL 12OZ", matchedFood: "Fruit loops cereal", quantity: 1, priceUsd: 3.98, matchConfidence: 0.88, matchFlag: "ok", confirmed: false, reviewedAt: new Date("2026-08-06") },
      // still pending — demos the default review-queue state.
      { receiptId: parsedReceipt.id, rawText: "BANANAS", matchedFood: "Bananas", quantity: 1, priceUsd: 1.42, matchConfidence: 0.97, matchFlag: "ok", confirmed: null },
    ],
  });
  await prisma.receipt.create({
    data: {
      patientId: sam.id,
      uploadDate: new Date("2026-08-04"),
      s3Key: "sam-rivera/receipts/blurry-2026-08-04.jpg",
      parseStatus: "failed",
    },
  });

  // Lab report: one parsed, with the review states the Health Report Analyzer needs to demo —
  // two findings confirmed (materialized into real NutrientGaps below, proving the pipeline
  // works end to end) and one still pending, same shape as the receipts review-queue demo above.
  const labReport = await prisma.labReport.create({
    data: {
      patientId: sam.id,
      uploadDate: new Date("2026-08-07"),
      s3Key: "sam-rivera/lab-reports/quest-2026-08-07.jpg",
      parseStatus: "parsed",
    },
  });
  await prisma.labReportFinding.createMany({
    data: [
      { labReportId: labReport.id, nutrient: "zinc", label: "Zinc", currentValue: 7, unit: "mg", confirmed: true, reviewedAt: new Date("2026-08-07") },
      { labReportId: labReport.id, nutrient: "folate", label: "Folate", currentValue: 250, unit: "mcg", confirmed: true, reviewedAt: new Date("2026-08-07") },
      // still pending — demos the default review-queue state, same as receipts' Bananas row.
      { labReportId: labReport.id, nutrient: "potassium", label: "Potassium", currentValue: 2900, unit: "mg", confirmed: null },
    ],
  });
  // Materialize the two confirmed findings into real NutrientGaps — same computation
  // confirmLabFinding() does at runtime (RDA_TARGETS ratio -> severity), kept in sync by hand
  // here since seeding bypasses the API.
  await prisma.nutrientGap.createMany({
    data: [
      { patientId: sam.id, nutrient: "zinc", label: "Zinc", currentValue: 7, targetValue: 11, unit: "mg", severity: "moderate" },
      { patientId: sam.id, nutrient: "folate", label: "Folate", currentValue: 250, targetValue: 400, unit: "mcg", severity: "moderate" },
    ],
  });

  // A short message thread so /me/messages and /rx/messages aren't empty on first load.
  await prisma.message.createMany({
    data: [
      { patientId: sam.id, dietitianId: maria.id, senderRole: "patient", body: "Hi Maria, quick question — can I have the lentils for breakfast instead of dinner?", createdAt: new Date("2026-08-06T09:12:00") },
      { patientId: sam.id, dietitianId: maria.id, senderRole: "dietitian", body: "Absolutely, Sam! Timing doesn't matter as much as consistency. Pair them with the bell peppers you're already picking up for the vitamin C boost.", readAt: new Date("2026-08-06T10:30:00"), createdAt: new Date("2026-08-06T10:05:00") },
      { patientId: sam.id, dietitianId: maria.id, senderRole: "patient", body: "Perfect, thank you!", createdAt: new Date("2026-08-06T10:32:00") },
    ],
  });

  // One valid, unexpired, unredeemed invite so /invite is demoable against real seed data.
  await prisma.patientInvite.create({
    data: {
      patientId: sam.id,
      code: "SAM-7XQK-2026",
      issuedBy: maria.id,
      expiresAt: new Date(new Date("2026-08-08").getTime() + 14 * 86400000),
    },
  });

  // Four lighter caseload patients — round out /rx into a real multi-patient practice.
  await seedCaseloadPatient({
    practiceId: practice.id, dietitianId: maria.id,
    name: "Elena Cruz", age: 61, conditions: ["Type 2 diabetes", "Hypertension"],
    restrictions: [], dislikes: ["shellfish"], weeklyBudgetUsd: 55,
    bmi: 27.8, bpSystolic: 142, bpDiastolic: 90,
    labs: [
      { name: "HbA1c", value: "7.8%", flag: "High" },
      { name: "LDL", value: "138 mg/dL", flag: "High" },
      { name: "Potassium", value: "3.3 mEq/L", flag: "Low" },
    ],
    cycleSlug: "elena-2026q2",
    gaps: [
      { nutrient: "potassium", label: "Potassium", current: 2400, target: 3500, unit: "mg", severity: "moderate", why: "Low intake while on a diuretic; supports BP management alongside DASH-style eating." },
      { nutrient: "fiber", label: "Fiber", current: 15, target: 28, unit: "g", severity: "moderate", why: "Below RDA; slows glucose response for Type 2 control." },
    ],
    approvedLists: {
      potassium: [
        { foodName: "Sweet potato", servingDescription: "1 medium", prep: "baked", amountPerServing: 540, unit: "mg", icon: "ph-bowl-food", status: "approved", note: "Fiber too — double duty for the Type 2 goal." },
        { foodName: "Swiss chard", servingDescription: "1 cup", prep: "cooked", amountPerServing: 960, unit: "mg", icon: "ph-leaf", status: "approved", note: "One of the highest potassium-per-serving greens." },
        { foodName: "Cantaloupe", servingDescription: "1 cup", prep: "", amountPerServing: 430, unit: "mg", icon: "ph-orange-slice", status: "flagged", note: "Higher glycemic load — confirm portion with Elena before approving." },
      ],
      fiber: [
        { foodName: "Black beans", servingDescription: "1 cup", prep: "cooked", amountPerServing: 15, unit: "g", icon: "ph-circles-three", status: "approved", note: "Closes the gap in one serving; low glycemic index." },
        { foodName: "Raspberries", servingDescription: "1 cup", prep: "", amountPerServing: 8, unit: "g", icon: "ph-orange-slice", status: "approved", note: "Low sugar relative to other fruit — safe for Type 2." },
      ],
    },
  });

  await seedCaseloadPatient({
    practiceId: practice.id, dietitianId: maria.id,
    name: "Marcus Bell", age: 47, conditions: ["Chronic kidney disease risk", "Hyperlipidemia"],
    restrictions: ["low-sodium"], dislikes: ["tofu"], weeklyBudgetUsd: 60,
    bmi: 31.2, bpSystolic: 148, bpDiastolic: 94,
    labs: [
      { name: "LDL", value: "162 mg/dL", flag: "High" },
      { name: "HDL", value: "38 mg/dL", flag: "Low" },
      { name: "Creatinine", value: "1.3 mg/dL", flag: "High" },
    ],
    cycleSlug: "marcus-2026q2",
    gaps: [
      { nutrient: "zinc", label: "Zinc", current: 6, target: 11, unit: "mg", severity: "severe", why: "Poor appetite this quarter; supports wound healing and immune function." },
      { nutrient: "folate", label: "Folate", current: 280, target: 400, unit: "mcg", severity: "moderate", why: "Low leafy-green intake; supports his cardiovascular risk profile." },
    ],
    approvedLists: {
      zinc: [
        { foodName: "Pumpkin seeds", servingDescription: "¼ cup", prep: "unsalted", amountPerServing: 2.9, unit: "mg", icon: "ph-plant", status: "approved", note: "No added sodium — fits the low-sodium restriction." },
        { foodName: "Chickpeas", servingDescription: "1 cup", prep: "cooked", amountPerServing: 2.5, unit: "mg", icon: "ph-circles-three", status: "approved", note: "Also fiber-forward for the lipid goal." },
        { foodName: "Oats", servingDescription: "1 cup", prep: "cooked", amountPerServing: 2.3, unit: "mg", icon: "ph-bowl-food", status: "flagged", note: "Check added-sugar toppings before approving." },
      ],
      folate: [
        { foodName: "Lentils", servingDescription: "1 cup", prep: "cooked", amountPerServing: 360, unit: "mcg", icon: "ph-bowl-food", status: "approved", note: "Closes most of the gap in one serving." },
        { foodName: "Spinach", servingDescription: "1 cup", prep: "cooked", amountPerServing: 260, unit: "mcg", icon: "ph-leaf", status: "approved", note: "Low-sodium prep — rinse if canned." },
      ],
    },
  });

  await seedCaseloadPatient({
    practiceId: practice.id, dietitianId: maria.id,
    name: "Priya Iyer", age: 34, conditions: ["Iron-deficiency anemia", "Postpartum"],
    restrictions: ["vegetarian"], dislikes: ["eggs"], weeklyBudgetUsd: 70,
    bmi: 23.4, bpSystolic: 112, bpDiastolic: 72,
    labs: [
      { name: "Ferritin", value: "14 ng/mL", flag: "Low" },
      { name: "Hemoglobin", value: "10.8 g/dL", flag: "Low" },
      { name: "Vitamin B12", value: "210 pg/mL", flag: "Low" },
    ],
    cycleSlug: "priya-2026q2",
    gaps: [
      { nutrient: "iron", label: "Iron (Fe)", current: 7, target: 18, unit: "mg", severity: "severe", why: "Postpartum anemia; sustained low intake across the log." },
      { nutrient: "vitamin_b12", label: "Vitamin B12", current: 1.8, target: 2.4, unit: "mcg", severity: "moderate", why: "Vegetarian diet limits B12 sources; needs fortified foods." },
    ],
    approvedLists: {
      iron: [
        { foodName: "Lentils", servingDescription: "1 cup", prep: "cooked", amountPerServing: 6.6, unit: "mg", icon: "ph-bowl-food", status: "approved", note: "Vegetarian-friendly, closes most of the daily gap." },
        { foodName: "Firm tofu", servingDescription: "1 cup", prep: "cubed", amountPerServing: 3.4, unit: "mg", icon: "ph-cube", status: "approved", note: "Confirmed Priya's fine with tofu (only eggs excluded)." },
        { foodName: "Fortified breakfast cereal", servingDescription: "1 serving", prep: "", amountPerServing: 18, unit: "mg", icon: "ph-bowl-food", status: "flagged", note: "Check added sugar before approving." },
      ],
      vitamin_b12: [
        { foodName: "Fortified nutritional yeast", servingDescription: "2 tbsp", prep: "", amountPerServing: 4, unit: "mcg", icon: "ph-plant", status: "approved", note: "Reliable vegetarian B12 source." },
        { foodName: "Fortified plant milk", servingDescription: "1 cup", prep: "", amountPerServing: 1, unit: "mcg", icon: "ph-drop", status: "approved", note: "Already in her habit model from receipts." },
        { foodName: "Swiss cheese", servingDescription: "1 oz", prep: "", amountPerServing: 0.9, unit: "mcg", icon: "ph-cube", status: "flagged", note: "Confirm she's okay with dairy day-to-day." },
      ],
    },
  });

  await seedCaseloadPatient({
    practiceId: practice.id, dietitianId: maria.id,
    name: "Robert Nguyen", age: 68, conditions: ["Osteoporosis risk", "Type 2 diabetes"],
    restrictions: [], dislikes: ["broccoli"], weeklyBudgetUsd: 45,
    bmi: 25.1, bpSystolic: 130, bpDiastolic: 82,
    labs: [
      { name: "HbA1c", value: "6.9%", flag: "High" },
      { name: "Calcium", value: "8.4 mg/dL", flag: "Low" },
      { name: "Vitamin D", value: "22 ng/mL", flag: "Low" },
    ],
    cycleSlug: "robert-2026q2",
    gaps: [
      { nutrient: "calcium", label: "Calcium", current: 700, target: 1200, unit: "mg", severity: "severe", why: "Osteoporosis risk; dietary calcium well below RDA." },
      { nutrient: "fiber", label: "Fiber", current: 14, target: 30, unit: "g", severity: "moderate", why: "Supports glycemic control for Type 2." },
      { nutrient: "vitamin_d", label: "Vitamin D", current: 22, target: 30, unit: "ng/mL", severity: "severe", why: "22 ng/mL (deficient). Dietary sources cannot close this gap; refer to MD for supplementation.", excluded: true, excludeReason: "Not food-first — excluded from the focus set." },
    ],
    approvedLists: {
      calcium: [
        { foodName: "Yogurt", servingDescription: "1 cup", prep: "plain", amountPerServing: 300, unit: "mg", icon: "ph-drop", status: "approved", note: "Also a protein source; fits his usual breakfast." },
        { foodName: "Kale", servingDescription: "1 cup", prep: "cooked", amountPerServing: 180, unit: "mg", icon: "ph-leaf", status: "approved", note: "Skips broccoli per his dislike — kale is the swap." },
        { foodName: "Sardines", servingDescription: "3 oz", prep: "canned, with bones", amountPerServing: 325, unit: "mg", icon: "ph-fish", status: "flagged", note: "Confirm he's willing to eat canned fish with bones." },
      ],
      fiber: [
        { foodName: "Chickpeas", servingDescription: "1 cup", prep: "cooked", amountPerServing: 12, unit: "g", icon: "ph-circles-three", status: "approved", note: "Closes most of the gap in one serving." },
        { foodName: "Pear", servingDescription: "1 medium", prep: "", amountPerServing: 5.5, unit: "g", icon: "ph-orange-slice", status: "approved", note: "Easy snack-sized top-up." },
      ],
    },
  });

  console.log(`Seeded practice=${practice.id} dietitian=${maria.id} patient=${sam.id} + 4 caseload patients`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
