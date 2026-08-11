import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { redeemInvite } from "@/lib/invite";
import { getPatientClerkClient } from "@/lib/patientClerk";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().optional(),
  age: z.number().int().positive().max(130),
});

const ERROR_MESSAGE: Record<string, string> = {
  not_found: "That code doesn't match an invite.",
  already_redeemed: "This code's already been used.",
  expired: "This code has expired.",
};

// POST /api/invite/finish — the last step after app/invite/claim confirms details. Trusts
// nothing from the request body about *who* the signer-upper is — only auth()'s userId, which
// proxy.ts's key resolver already scoped to the patient Clerk app for this path. The body only
// supplies what a human needs to confirm: name (pre-filled from Google when available) and
// age (never pre-filled — always overrides whatever the dietitian estimated at "Add patient"
// time; see lib/invite.ts's redeemInvite()).
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`invite-finish:${ip}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const client = getPatientClerkClient();
  if (!client) return NextResponse.json({ error: "Sign-up isn't available right now." }, { status: 500 });
  const clerkUser = await client.users.getUser(userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ error: "Your Google account has no email to verify." }, { status: 400 });

  const result = await redeemInvite(
    parsed.data.code,
    { email, googleUserId: userId, firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    parsed.data.age,
  );

  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGE[result.error] ?? "Couldn't redeem that code." }, { status: 400 });
  }
  return NextResponse.json({ patientId: result.patientId, patientFirstName: result.patientFirstName });
}
