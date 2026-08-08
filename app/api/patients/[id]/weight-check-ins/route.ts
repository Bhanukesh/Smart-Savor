import { NextResponse } from "next/server";
import { z } from "zod";
import { getWeightCheckIns, addWeightCheckIn } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const checkInBody = z.object({
  weightLb: z.number().positive().max(1000),
  note: z.string().max(500).optional(),
});

// GET /api/patients/:id/weight-check-ins?weeks=4 — for the Profile and Progress mini-charts
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const weeks = Math.min(52, Math.max(1, Number(new URL(req.url).searchParams.get("weeks")) || 4));
  return NextResponse.json({ checkIns: await getWeightCheckIns(id, weeks) });
}

// POST /api/patients/:id/weight-check-ins — clinical monitoring, never a weight-loss target
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = checkInBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const checkIn = await addWeightCheckIn(id, parsed.data.weightLb, parsed.data.note);
  if (!checkIn) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json(checkIn);
}
