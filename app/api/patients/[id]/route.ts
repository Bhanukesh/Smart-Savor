import { NextResponse } from "next/server";
import { getPatient } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const p = await getPatient(params.id);
  if (!p) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json(p);
}
