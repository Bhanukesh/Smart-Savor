import { NextResponse } from "next/server";
import { z } from "zod";
import { listPatients, createPatient } from "@/lib/data";
import { generateInviteForPatient } from "@/lib/invite";
import { getSessionDietitian } from "@/lib/auth/dietitian";
import { invitePatientByEmail } from "@/lib/patientClerk";

export const dynamic = "force-dynamic";

// GET /api/patients — caseload list
export async function GET() {
  return NextResponse.json(await listPatients());
}

const createBody = z.object({
  name: z.string().trim().min(1),
  age: z.number().int().positive().max(130),
  email: z.string().trim().email().optional(),
});

// POST /api/patients — "Add patient": create the record, mint an invite code, and (if an
// email was given) send it via the patient Clerk app's own invitation email — "add patient"
// and "send invite" land as one natural step. A missing/unconfigured patient Clerk app
// degrades to the same manual-copy-link experience this always had; see lib/patientClerk.ts.
export async function POST(req: Request) {
  const parsed = createBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // proxy.ts already requires a valid, linked dietitian session to reach this route.
  const dietitian = await getSessionDietitian();
  if (!dietitian) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const patient = await createPatient(parsed.data, dietitian.dietitianId);
  if (!patient) return NextResponse.json({ error: "no dietitian/practice on file to assign this patient to" }, { status: 404 });

  const invite = await generateInviteForPatient(patient.id);
  if (!invite) return NextResponse.json({ error: "patient created but invite generation failed" }, { status: 500 });

  let emailSent = false;
  if (parsed.data.email) {
    const redirectUrl = new URL(`/invite/signup?code=${invite.code}`, req.url).toString();
    const result = await invitePatientByEmail(parsed.data.email, redirectUrl, { inviteCode: invite.code });
    emailSent = result.ok;
  }

  return NextResponse.json({ patientId: patient.id, emailSent, ...invite });
}
