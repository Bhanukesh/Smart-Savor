import { NextResponse } from "next/server";
import { getInviteStatus, generateInviteForPatient } from "@/lib/invite";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/invite — current onboarding state for the "Send invite" panel
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const status = await getInviteStatus(id);
  if (!status) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json(status);
}

// POST /api/patients/:id/invite — "Send invite": mint (or regenerate) a code
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const invite = await generateInviteForPatient(id);
  if (!invite) return NextResponse.json({ error: "patient not found or has no assigned dietitian" }, { status: 404 });
  return NextResponse.json(invite);
}
