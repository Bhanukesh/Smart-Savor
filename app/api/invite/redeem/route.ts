import { NextResponse } from "next/server";
import { z } from "zod";
import { redeemInvite } from "@/lib/invite";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const redeemBody = z.object({
  code: z.string().min(1),
  identity: z.object({
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
  }),
});

const ERROR_MESSAGE: Record<string, string> = {
  not_found: "That code doesn't match an invite.",
  already_redeemed: "This code's already been used.",
  expired: "This code has expired.",
};

// POST /api/invite/redeem — validate the invite, verify identity (mocked), create the
// patient's account + session. See lib/invite.ts.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`invite-redeem:${ip}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const parsed = redeemBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await redeemInvite(parsed.data.code, parsed.data.identity);
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGE[result.error] ?? "Couldn't redeem that code." }, { status: 400 });
  }
  return NextResponse.json({ patientId: result.patientId, patientFirstName: result.patientFirstName });
}
