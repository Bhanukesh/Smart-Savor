import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/health
export function GET() {
  return NextResponse.json({ status: "ok", service: "smart-savor" });
}
