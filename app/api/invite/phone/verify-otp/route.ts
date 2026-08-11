import { NextResponse } from "next/server";
import { z } from "zod";
import { checkInviteCode } from "@/lib/invite";
import { checkOtp } from "@/lib/sms";
import { setPendingIdentity } from "@/lib/invitePendingIdentity";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().min(1),
  phone: z.string().trim().min(1),
  otp: z.string().trim().min(4),
});

// POST /api/invite/phone/verify-otp — checks the code against Twilio Verify (real, not
// mocked); on success, stashes the verified phone the same way the Google callback stashes a
// verified email, for app/invite/details to pick up.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`invite-otp-verify:${ip}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the code you were texted." }, { status: 400 });

  const check = await checkInviteCode(parsed.data.code);
  if (!check.valid) return NextResponse.json({ error: "That invite code didn't work." }, { status: 400 });

  const verified = await checkOtp(parsed.data.phone, parsed.data.otp);
  if (!verified) return NextResponse.json({ error: "Incorrect or expired code." }, { status: 400 });

  await setPendingIdentity({ provider: "phone_otp", inviteCode: parsed.data.code, phone: parsed.data.phone });
  return NextResponse.json({ ok: true });
}
