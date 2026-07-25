import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderFocusSet } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const reorderBody = z.object({
  nutrientGapIds: z.array(z.string().uuid()).min(1),
});

// PATCH /api/patients/:id/focus-set/reorder — "Override ranking": drag-and-drop reorder
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = reorderBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const focus = await reorderFocusSet(id, parsed.data.nutrientGapIds);
  if (!focus) return NextResponse.json({ error: "patient/cycle not found" }, { status: 404 });
  return NextResponse.json(focus);
}
