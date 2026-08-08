import { NextResponse } from "next/server";
import { getLabReportDetail } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/lab-reports/:reportId — detail + findings, for the review screen
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  const { id, reportId } = await params;
  if (!isUuid(id) || !isUuid(reportId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const report = await getLabReportDetail(id, reportId);
  if (!report) return NextResponse.json({ error: "lab report not found" }, { status: 404 });
  return NextResponse.json(report);
}
