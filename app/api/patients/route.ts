import { NextResponse } from "next/server";
import { listPatients } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/patients — caseload list
export async function GET() {
  return NextResponse.json(await listPatients());
}
