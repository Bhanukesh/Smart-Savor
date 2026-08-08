import { NextResponse } from "next/server";
import { getPatient, deletePatient } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const p = await getPatient(id);
  if (!p) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json(p);
}

// DELETE /api/patients/:id — remove a patient and every dependent row (receipts, labs,
// consumption, focus set, approved lists, messages, invite, account). No undo.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });

  const deleted = await deletePatient(id);
  if (!deleted) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
