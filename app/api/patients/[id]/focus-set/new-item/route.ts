import { NextResponse } from "next/server";
import { z } from "zod";
import { createAndAddFocusItem } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const NUTRIENT_KEYS = [
  "iron", "vitamin_c", "magnesium", "calcium", "potassium", "zinc",
  "fiber", "protein", "folate", "vitamin_d", "vitamin_b12", "sodium",
] as const;

const newItemBody = z.object({
  nutrient: z.enum(NUTRIENT_KEYS),
  currentValue: z.number(),
  targetValue: z.number().positive(),
  severity: z.enum(["severe", "moderate", "mild"]),
  why: z.string().max(500).optional(),
});

// POST /api/patients/:id/focus-set/new-item — "Track a new nutrient gap": create a
// NutrientGap the patient has nothing on file for yet, and rank it
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = newItemBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { why, ...rest } = parsed.data;
  const focus = await createAndAddFocusItem(id, { ...rest, why: why ?? "" });
  if (!focus) return NextResponse.json({ error: "patient, cycle, or nutrient not found" }, { status: 404 });
  return NextResponse.json(focus);
}
