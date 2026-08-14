import { NextResponse } from "next/server";
import { z } from "zod";
import { updateFocusItem, removeFocusItem } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateBody = z.object({
  why: z.string().max(500).optional(),
  currentValue: z.number().optional(),
  targetValue: z.number().positive().optional(),
  severity: z.enum(["severe", "moderate", "mild"]).optional(),
});

// PATCH /api/patients/:id/focus-set/items/:gapId — edit a ranked focus item (the update half
// of focus-set CRUD; :gapId is the NutrientGap id, same key reorder already uses).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; gapId: string }> }) {
  const { id, gapId } = await params;
  if (!isUuid(id) || !isUuid(gapId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const parsed = updateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const focus = await updateFocusItem(id, gapId, parsed.data);
  if (!focus) return NextResponse.json({ error: "patient, cycle, or focus item not found" }, { status: 404 });
  return NextResponse.json(focus);
}

// DELETE /api/patients/:id/focus-set/items/:gapId — remove a focus item from the ranked set
// (the delete half of focus-set CRUD). The underlying nutrient gap survives, so it can be
// brought back later via "Add focus item".
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; gapId: string }> }) {
  const { id, gapId } = await params;
  if (!isUuid(id) || !isUuid(gapId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const focus = await removeFocusItem(id, gapId);
  if (!focus) return NextResponse.json({ error: "patient, cycle, or focus item not found" }, { status: 404 });
  return NextResponse.json(focus);
}
