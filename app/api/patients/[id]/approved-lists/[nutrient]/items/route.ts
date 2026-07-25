import { NextResponse } from "next/server";
import { z } from "zod";
import { addGroceryItemToApprovedList } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const addBody = z.object({ groceryItemId: z.string().uuid() });

// POST /api/patients/:id/approved-lists/:nutrient/items — add a specific searched-for food
export async function POST(
  req: Request,
  { params }: { params: { id: string; nutrient: string } },
) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = addBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const list = await addGroceryItemToApprovedList(params.id, params.nutrient, parsed.data.groceryItemId);
  if (!list) return NextResponse.json({ error: "approved list or grocery item not found" }, { status: 404 });
  return NextResponse.json(list);
}
