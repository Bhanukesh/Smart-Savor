import { NextResponse } from "next/server";
import { z } from "zod";
import { updateApprovedListItem } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const patchBody = z.object({
  action: z.enum(["approve", "restore", "remove", "edit"]),
  note: z.string().optional(),
});

// PATCH /api/patients/:id/approved-lists/:nutrient/items/:itemId — ratify-screen actions
export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  if (!isUuid(itemId)) return NextResponse.json({ error: "invalid item id" }, { status: 400 });
  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const item = await updateApprovedListItem(itemId, parsed.data.action, parsed.data.note);
  if (!item) return NextResponse.json({ error: "item not found" }, { status: 404 });
  return NextResponse.json(item);
}
