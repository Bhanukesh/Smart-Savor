import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionDietitian, createColleagueInvitation } from "@/lib/auth/dietitian";

export const dynamic = "force-dynamic";

const inviteBody = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
});

// POST /api/team/invites — invite a colleague by email (Clerk sends the invite email;
// Restricted mode means only that exact address can complete sign-up with it).
export async function POST(req: Request) {
  const dietitian = await getSessionDietitian();
  if (!dietitian) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = inviteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const invite = await createColleagueInvitation(dietitian.dietitianId, parsed.data.name, parsed.data.email);
  if (!invite) return NextResponse.json({ error: "could not create invite" }, { status: 500 });

  return NextResponse.json(invite);
}
