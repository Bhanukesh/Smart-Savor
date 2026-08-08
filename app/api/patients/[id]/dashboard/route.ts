import { NextResponse } from "next/server";
import { computeDashboard } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/dashboard — real intake-toward-target gauges, for client-side
// refresh after a Quick Log submit (the page itself calls computeDashboard() directly).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const gauges = await computeDashboard(id);
  return NextResponse.json({ gauges });
}
