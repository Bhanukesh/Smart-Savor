import { NextResponse } from "next/server";
import { getAvailableNutrientGaps } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/focus-set/available — nutrient gaps not yet in the focus set,
// for the "Add focus item" picker
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  return NextResponse.json(await getAvailableNutrientGaps(id));
}
