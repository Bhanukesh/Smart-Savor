import { NextResponse } from "next/server";
import { z } from "zod";
import { getReceipts, createReceiptFromUpload } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const receiptBody = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.string().default("image/jpeg"),
});

// GET /api/patients/:id/receipts — list, most recent first
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  return NextResponse.json({ receipts: await getReceipts(id) });
}

// POST /api/patients/:id/receipts — upload + parse (Claude vision). Line items land
// confirmed=null; nothing feeds the habit model until reviewed.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = receiptBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const receipt = await createReceiptFromUpload(id, parsed.data.imageBase64, parsed.data.mediaType);
  if (!receipt) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json(receipt);
}
