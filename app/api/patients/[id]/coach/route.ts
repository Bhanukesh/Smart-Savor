import { NextResponse } from "next/server";
import { z } from "zod";
import { runCoachTurn } from "@/lib/foodCoach";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const coachBody = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(40)
    .optional(),
});

// POST /api/patients/:id/coach — one turn of the Food Coach agent
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = coachBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const reply = await runCoachTurn(id, parsed.data.history ?? [], parsed.data.message);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "coach is unavailable right now" }, { status: 502 });
  }
}
