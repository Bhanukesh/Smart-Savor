import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmReceiptLineItem } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const confirmBody = z.object({ confirmed: z.boolean() });

// PATCH /api/patients/:id/receipts/:receiptId/line-items/:lineItemId — the review/confirm
// step: true = "this is mine" (feeds the habit model), false = "not mine" (excluded, e.g. a
// family member's purchase).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; receiptId: string; lineItemId: string }> },
) {
  const { id, receiptId, lineItemId } = await params;
  if (!isUuid(id) || !isUuid(receiptId) || !isUuid(lineItemId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const parsed = confirmBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await confirmReceiptLineItem(id, receiptId, lineItemId, parsed.data.confirmed);
  if (!item) return NextResponse.json({ error: "line item not found" }, { status: 404 });
  return NextResponse.json(item);
}
