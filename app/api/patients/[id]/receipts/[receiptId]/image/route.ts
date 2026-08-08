import { NextResponse } from "next/server";
import { prisma, isUuid } from "@/lib/db";
import { readUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// GET /api/patients/:id/receipts/:receiptId/image — streams the stored upload. Storage
// lives outside /public (lib/storage.ts), so this route is the only way to fetch it back.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; receiptId: string }> }) {
  const { id, receiptId } = await params;
  if (!isUuid(id) || !isUuid(receiptId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const receipt = await prisma.receipt.findFirst({ where: { id: receiptId, patientId: id }, select: { s3Key: true } });
  if (!receipt) return NextResponse.json({ error: "receipt not found" }, { status: 404 });

  try {
    const buf = await readUpload(receipt.s3Key);
    const ext = receipt.s3Key.split(".").pop() ?? "";
    return new NextResponse(new Uint8Array(buf), {
      headers: { "content-type": CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "image not found" }, { status: 404 });
  }
}
