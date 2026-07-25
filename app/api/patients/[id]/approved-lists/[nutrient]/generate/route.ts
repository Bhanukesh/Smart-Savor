import { NextResponse } from "next/server";
import { generateCandidatesFromGrocery } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/patients/:id/approved-lists/:nutrient/generate — "Add candidate": sources new draft
// items from the real grocery_items reference table (Walmart x USDA join), ranked by gap efficiency.
export async function POST(_req: Request, { params }: { params: { id: string; nutrient: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const list = await generateCandidatesFromGrocery(params.id, params.nutrient);
  if (!list) return NextResponse.json({ error: "no approved list for that gap" }, { status: 404 });
  return NextResponse.json(list);
}
