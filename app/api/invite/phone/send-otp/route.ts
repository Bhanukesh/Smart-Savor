import { NextResponse } from "next/server";
import { z } from "zod";
import { checkInviteCode } from "@/lib/invite";
import { sendOtp } from "@/lib/sms";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ code: z.string().min(1), phone: z.string().trim().min(1) });

// POST /api/invite/phone/send-otp — real Twilio Verify OTP, not the old mocked
// "accepts whatever's submitted" identity. Rate-limited per IP: this is the endpoint that
// actually costs money per call.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`invite-otp-send:${ip}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a phone number." }, { status: 400 });

  const check = await checkInviteCode(parsed.data.code);
  if (!check.valid) return NextResponse.json({ error: "That invite code didn't work." }, { status: 400 });

  const result = await sendOtp(parsed.data.phone);
  if (!result.ok) {
    const message =
      result.error === "not_configured"
        ? "Phone sign-up isn't available right now — try Google instead."
        : "Couldn't send a code to that number — double-check it and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
