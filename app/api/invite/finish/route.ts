import { NextResponse } from "next/server";
import { z } from "zod";
import { redeemInvite } from "@/lib/invite";
import { getPendingIdentity, clearPendingIdentity } from "@/lib/invitePendingIdentity";
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

// POST /api/invite/finish — the web signup flow's last step, after Google or phone/OTP
// verification. Trusts nothing from the request body about *who* the signer-upper is — only
// the pending-identity cookie set by app/api/invite/google/callback or
// app/api/invite/phone/verify-otp, both of which did real verification. The body only
// supplies what a human needs to confirm: name (pre-filled from Google when available) and
// age (never pre-filled — Google doesn't provide birthdate, and this always overrides
// whatever age the dietitian estimated at "Add patient" time).
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`invite-finish:${ip}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pending = await getPendingIdentity();
  if (!pending || pending.inviteCode !== parsed.data.code) {
    return NextResponse.json({ error: "Your verification expired — start again." }, { status: 400 });
  }

  const identity =
    pending.provider === "google"
      ? { email: pending.email, googleUserId: pending.googleUserId }
      : { phone: pending.phone };

  const result = await redeemInvite(
    parsed.data.code,
    { ...identity, firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    parsed.data.age,
  );
  await clearPendingIdentity();

  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGE[result.error] ?? "Couldn't redeem that code." }, { status: 400 });
  }
  return NextResponse.json({ patientId: result.patientId, patientFirstName: result.patientFirstName });
}
