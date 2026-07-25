import { NextResponse } from "next/server";
import { getApprovedList } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/approved-lists/:nutrient
export async function GET(
  _req: Request,
  { params }: { params: { id: string; nutrient: string } },
) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const list = await getApprovedList(params.id, params.nutrient);
  if (!list) return NextResponse.json({ error: "no approved list for that gap" }, { status: 404 });
  return NextResponse.json(list);
}
