import { NextResponse } from "next/server";
import { getFocusSet } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/focus-set
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  return NextResponse.json(await getFocusSet(params.id));
}
