import { NextResponse } from "next/server";
import { searchGroceryItems } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/grocery-items/search?q=... — free-text search across the 8,986-row reference table
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await searchGroceryItems(q);
  return NextResponse.json({ results });
}
