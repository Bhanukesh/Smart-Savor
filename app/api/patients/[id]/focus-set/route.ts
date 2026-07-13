import { NextResponse } from "next/server";
import { getFocusSet } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/patients/:id/focus-set
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await getFocusSet(params.id));
}
