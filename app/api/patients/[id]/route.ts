import { NextResponse } from "next/server";
import { getPatient } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/patients/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const p = await getPatient(params.id);
  if (!p) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json(p);
}
