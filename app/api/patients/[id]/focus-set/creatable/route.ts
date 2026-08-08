import { NextResponse } from "next/server";
import { getCreatableNutrients } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/focus-set/creatable — nutrients with no gap on file yet, for
// "Track a new nutrient gap"
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  return NextResponse.json(await getCreatableNutrients(id));
}
