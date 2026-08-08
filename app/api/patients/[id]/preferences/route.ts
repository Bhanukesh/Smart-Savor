import { NextResponse } from "next/server";
import { z } from "zod";
import { setDietaryPreferences } from "@/lib/data";
import { isUuid } from "@/lib/db";

export const dynamic = "force-dynamic";

const preferencesBody = z.object({
  restrictions: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  weeklyBudgetUsd: z.number().positive().optional(),
  weeklyNudgeEnabled: z.boolean().optional(),
});

// PATCH /api/patients/:id/preferences — backs the "Your Plan" section of /me/profile
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid patient id" }, { status: 400 });
  const parsed = preferencesBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const patient = await setDietaryPreferences(id, parsed.data);
  if (!patient) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  return NextResponse.json(patient);
}
