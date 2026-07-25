import { NextResponse } from "next/server";
import { confirmFocusSet } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/patients/:id/focus-set/confirm — D1.5 "Confirm focus set" gesture
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const confirmedAt = await confirmFocusSet(params.id);
  if (!confirmedAt) return NextResponse.json({ error: "patient/cycle not found" }, { status: 404 });
  return NextResponse.json({ confirmedAt });
}
