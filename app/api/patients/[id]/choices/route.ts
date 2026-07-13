import { NextResponse } from "next/server";
import { z } from "zod";
import { createChoice } from "@/lib/data";

export const dynamic = "force-dynamic";

const choiceBody = z.object({
  approvedListItemId: z.string().uuid(),
  gapRemaining: z.number().positive().optional(),
});

// POST /api/patients/:id/choices — the USP recompute + persist
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const parsed = choiceBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await createChoice(params.id, parsed.data.approvedListItemId, parsed.data.gapRemaining);
  if (!result) return NextResponse.json({ error: "approved list item not found" }, { status: 404 });
  return NextResponse.json(result);
}
