import { NextResponse } from "next/server";
import { getApprovedList } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/approved-lists/:nutrient
export async function GET(
  _req: Request,
  { params }: { params: { id: string; nutrient: string } },
) {
  const list = await getApprovedList(params.id, params.nutrient);
  if (!list) return NextResponse.json({ error: "no approved list for that gap" }, { status: 404 });
  return NextResponse.json(list);
}
