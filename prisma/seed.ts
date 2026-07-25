/**
 * Seed — patient Sam Rivera, dietitian Maria, RD. Same data the frontend mock uses
 * (frontend/lib/mock.ts), so the wired app matches the standalone FE exactly.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // clean (dependency order) for idempotent re-seeding
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
    data: { practiceId: practice.id, name: "Maria, RD", credential: "RD", email: "maria@metronutrition.example" },
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

  const cycle = await prisma.cycle.create({
    data: {
      patientId: sam.id,
      cycleSlug: "sam-2026q2",
      startDate: new Date("2026-04-02"),
      retestDueDate: new Date("2026-07-02"),
      status: "active",
      focusSetVersion: 0,
    },
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

  console.log(`Seeded practice=${practice.id} dietitian=${maria.id} patient=${sam.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
