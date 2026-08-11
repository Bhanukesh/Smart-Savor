import { NextResponse } from "next/server";
import { z } from "zod";
import { listPatients, createPatient } from "@/lib/data";
import { generateInviteForPatient } from "@/lib/invite";
import { getSessionDietitian } from "@/lib/auth/dietitian";
import { sendInviteSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

// GET /api/patients — caseload list
export async function GET() {
  return NextResponse.json(await listPatients());
}

const createBody = z.object({
  name: z.string().trim().min(1),
  age: z.number().int().positive().max(130),
  phone: z.string().trim().min(1).optional(),
});

// POST /api/patients — "Add patient": create the record, mint an invite code, and (if a
// phone number was given) text it — "add patient" and "send invite" land as one natural
// step. A missing/unconfigured Twilio setup degrades to the same manual-copy-link experience
// this always had; see lib/sms.ts.
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

  let smsSent = false;
  if (parsed.data.phone) {
    const inviteLink = new URL(`/invite/signup?code=${invite.code}`, req.url).toString();
    const result = await sendInviteSms(parsed.data.phone, parsed.data.name.split(" ")[0], dietitian.dietitianName, inviteLink);
    smsSent = result.ok;
  }

  return NextResponse.json({ patientId: patient.id, smsSent, ...invite });
}
