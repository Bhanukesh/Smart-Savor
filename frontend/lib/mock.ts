/**
 * Seeded demo data — patient Sam Rivera (Type 2 + cardiac risk), dietitian Maria, RD.
 * Matches the capstone demo story and the prototype. Real prices/nutrients come from the
 * 8,986-row Walmart×USDA join once the backend is wired.
 */
import type {
  Patient, NutrientGap, FocusItem, ApprovedList, DashboardGauge,
} from "./types";

export const PATIENT: Patient = {
  id: "sam-rivera",
  name: "Sam Rivera",
  age: 54,
  conditions: ["Type 2 diabetes", "Cardiac history"],
  bmi: 30.3,
  bpSystolic: 138,
  bpDiastolic: 88,
  dietitianName: "Maria, RD",
  labs: [
    { name: "HbA1c", value: "7.2%", flag: "High" },
    { name: "LDL", value: "151 mg/dL", flag: "High" },
    { name: "HDL", value: "34 mg/dL", flag: "Low" },
    { name: "Triglycerides", value: "210 mg/dL", flag: "High" },
    { name: "Vitamin D", value: "18 ng/mL", flag: "Low" },
  ],
};

const IRON_GAP: NutrientGap = {
  id: "gap-iron", nutrient: "iron", label: "Iron (Fe)",
  currentValue: 9, targetValue: 18, unit: "mg", severity: "severe",
};
const VITC_GAP: NutrientGap = {
  id: "gap-vitc", nutrient: "vitamin_c", label: "Vitamin C",
  currentValue: 40, targetValue: 90, unit: "mg", severity: "moderate",
};
const MAG_GAP: NutrientGap = {
  id: "gap-mag", nutrient: "magnesium", label: "Magnesium",
  currentValue: 300, targetValue: 420, unit: "mg", severity: "moderate",
};

export const FOCUS_SET: FocusItem[] = [
  {
    rank: 1, gap: IRON_GAP,
    why: "Sustained low intake across the 14-day log; patient reports fatigue.",
    pairWith: "vitamin C", conflictsWith: "calcium supplements, tea/coffee within 1 h of meals",
  },
  {
    rank: 2, gap: VITC_GAP,
    why: "Produce intake low; sequenced with iron to drive absorption.",
    pairWith: "iron (#1)",
  },
  {
    rank: 3, gap: MAG_GAP,
    why: "Adjunct for BP management (138/88); intake below RDA.",
  },
  {
    rank: 4,
    gap: { id: "gap-vitd", nutrient: "vitamin_d", label: "Vitamin D", currentValue: 18, targetValue: 30, unit: "ng/mL", severity: "severe" },
    why: "18 ng/mL (deficient). Dietary sources cannot close this gap; refer to MD for supplementation.",
    excluded: true,
    excludeReason: "Not food-first — excluded from the focus set.",
  },
];

export const IRON_APPROVED_LIST: ApprovedList = {
  gap: IRON_GAP,
  status: "ratified",
  ratifiedBy: "Maria, RD",
  items: [
    { id: "i-lentils", foodName: "Lentils", fdcId: "172420", servingDescription: "1 cup", prep: "cooked", amountPerServing: 6.6, unit: "mg", icon: "ph-bowl-food", status: "approved", note: "High fiber slows glucose response — fits Type 2." },
    { id: "i-spinach", foodName: "Spinach", fdcId: "168462", servingDescription: "1 cup", prep: "cooked", amountPerServing: 3.6, unit: "mg", icon: "ph-leaf", status: "approved", note: "Pair with a vitamin C source for absorption." },
    { id: "i-chickpeas", foodName: "Chickpeas", fdcId: "173801", servingDescription: "1 cup", prep: "cooked", amountPerServing: 4.7, unit: "mg", icon: "ph-circles-three", status: "approved", note: "Also ~78 mg magnesium/cup toward focus #3." },
    { id: "i-whitebeans", foodName: "White beans", fdcId: "175204", servingDescription: "1 cup", prep: "canned, rinsed", amountPerServing: 7.8, unit: "mg", icon: "ph-drop", status: "approved", edited: true, note: "Edit applied: low-sodium only, rinse before use (BP 138/88)." },
    { id: "i-tofu", foodName: "Firm tofu", fdcId: "172476", servingDescription: "1 cup", prep: "cubed", amountPerServing: 6.8, unit: "mg", icon: "ph-cube", status: "approved", note: "Lean protein swap displacing saturated-fat sources." },
    { id: "i-pumpkin", foodName: "Pumpkin seeds", fdcId: "170556", servingDescription: "¼ cup", prep: "unsalted", amountPerServing: 2.3, unit: "mg", icon: "ph-plant", status: "approved", note: "Snack-sized top-up for magnesium days too." },
    { id: "i-cereal", foodName: "Fortified breakfast cereal", servingDescription: "1 serving", prep: "", amountPerServing: 18, unit: "mg", icon: "ph-bowl-food", status: "flagged", note: "~18 mg/serving but 12 g added sugar — conflicts with Type 2 screen. Suggested edit: unsweetened fortified bran variant." },
    { id: "i-liver", foodName: "Beef liver", servingDescription: "3 oz", prep: "", amountPerServing: 5.6, unit: "mg", icon: "ph-hamburger", status: "excluded", note: "330 mg cholesterol — fails cardiac screen (LDL 151). Auto-excluded; not shown to patient." },
  ],
};

/** the gap the patient still has to close today (9 of 18 mg logged) */
export const IRON_GAP_REMAINING = 9;

export const DASHBOARD: DashboardGauge[] = [
  { label: "Iron", icon: "ph-drop", current: 15, target: 18, baseline: 9, unit: "mg", inRange: false, caption: "Up from 9 mg at baseline · logged foods · target 18 mg/day" },
  { label: "Vitamin C", icon: "ph-orange-slice", current: 92, target: 90, baseline: 40, unit: "mg", inRange: true, caption: "Target met 3 days running · up from 40 mg at baseline · target 90 mg/day" },
  { label: "Magnesium", icon: "ph-lightning", current: 350, target: 420, baseline: 300, unit: "mg", inRange: false, caption: "Up from 300 mg at baseline · logged foods · target 420 mg/day" },
];
