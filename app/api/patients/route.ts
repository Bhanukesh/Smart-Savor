import { NextResponse } from "next/server";
import { z } from "zod";
import { listPatients, createPatient } from "@/lib/data";
import { generateInviteForPatient } from "@/lib/invite";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/patients — caseload list
export async function GET() {
  return NextResponse.json(await listPatients());
}

const createBody = z.object({
  name: z.string().trim().min(1),
  age: z.number().int().positive().max(130),
});

// POST /api/patients — "Add patient": create the record, then immediately mint an invite
// code, so onboarding a new patient and sending them a code is one step, not two.
export async function POST(req: Request) {
  const parsed = createBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // proxy.ts already requires a valid dietitian session to reach this route.
  const sessionUser = await getSessionUser();
  if (!sessionUser?.dietitianId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const patient = await createPatient(parsed.data, sessionUser.dietitianId);
  if (!patient) return NextResponse.json({ error: "no dietitian/practice on file to assign this patient to" }, { status: 404 });

  const invite = await generateInviteForPatient(patient.id);
  if (!invite) return NextResponse.json({ error: "patient created but invite generation failed" }, { status: 500 });

  return NextResponse.json({ patientId: patient.id, ...invite });
}
