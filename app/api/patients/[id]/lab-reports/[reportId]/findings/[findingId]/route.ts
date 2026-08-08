import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmLabFinding } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const confirmBody = z.object({ confirmed: z.boolean() });

// PATCH /api/patients/:id/lab-reports/:reportId/findings/:findingId — the dietitian's human
// gate on Agent 1's output: true = confirm (materializes a real NutrientGap), false = reject
// (e.g. a misread value).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; reportId: string; findingId: string }> },
) {
  const { id, reportId, findingId } = await params;
  if (!isUuid(id) || !isUuid(reportId) || !isUuid(findingId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const parsed = confirmBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const finding = await confirmLabFinding(id, reportId, findingId, parsed.data.confirmed);
  if (!finding) return NextResponse.json({ error: "finding not found" }, { status: 404 });
  return NextResponse.json(finding);
}
