import { NextResponse } from "next/server";
import { getReceiptDetail } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/receipts/:receiptId — detail + line items, for the review screen
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; receiptId: string }> }) {
  const { id, receiptId } = await params;
  if (!isUuid(id) || !isUuid(receiptId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const receipt = await getReceiptDetail(id, receiptId);
  if (!receipt) return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  return NextResponse.json(receipt);
}
