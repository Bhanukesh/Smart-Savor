import { NextResponse } from "next/server";
import { z } from "zod";
import { addFocusItem } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const addBody = z.object({
  nutrientGapId: z.string().uuid(),
  why: z.string().max(500).optional(),
});

// POST /api/patients/:id/focus-set/items — "Add focus item": bring an off-list gap into the
// ranked focus set
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = addBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const focus = await addFocusItem(id, parsed.data.nutrientGapId, parsed.data.why ?? "");
  if (!focus) return NextResponse.json({ error: "patient, cycle, or nutrient gap not found" }, { status: 404 });
  return NextResponse.json(focus);
}
