import { NextResponse } from "next/server";
import { getShoppingList } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/shopping-list — whichever food is currently the active pick for each
// focus area, for the patient's own reference while grocery shopping. Called by both /me/* and
// mobile/ — see proxy.ts's PATIENT_SAFE_PATTERNS.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const items = await getShoppingList(id);
  return NextResponse.json({ items });
}
