import { NextResponse } from "next/server";
import { z } from "zod";
import { getLabReports, createLabReportFromUpload } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const labReportBody = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.string().default("image/jpeg"),
});

// GET /api/patients/:id/lab-reports — list, most recent first
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  return NextResponse.json({ labReports: await getLabReports(id) });
}

// POST /api/patients/:id/lab-reports — upload + parse (Claude vision, "Agent 1"). Findings
// land confirmed=null; nothing becomes a real NutrientGap until the dietitian reviews it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = labReportBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const report = await createLabReportFromUpload(id, parsed.data.imageBase64, parsed.data.mediaType);
  if (!report) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json(report);
}
