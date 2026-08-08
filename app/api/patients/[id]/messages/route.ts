import { NextResponse } from "next/server";
import { z } from "zod";
import { getMessages, sendMessage } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const messageBody = z.object({
  body: z.string().min(1).max(2000),
  senderRole: z.enum(["patient", "dietitian"]),
});

// GET /api/patients/:id/messages — full thread
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  return NextResponse.json({ messages: await getMessages(id) });
}

// POST /api/patients/:id/messages — reused by both the patient chat and the dietitian
// reply UI. senderRole is client-supplied since no dietitian session exists yet — tightens
// once dietitian auth lands.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = messageBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const message = await sendMessage(id, parsed.data.senderRole, parsed.data.body);
  if (!message) return NextResponse.json({ error: "patient has no assigned dietitian" }, { status: 404 });
  return NextResponse.json(message);
}
