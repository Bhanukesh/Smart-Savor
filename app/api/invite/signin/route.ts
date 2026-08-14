import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { signInReturningPatient } from "@/lib/invite";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/invite/signin — returning-patient sign-in, no code. Same auth() as
// /api/invite/finish (proxy.ts's key resolver scopes this whole /api/invite/* prefix to the
// patient Clerk app), but looks an existing account up by that verified identity instead of
// redeeming a fresh invite. 404s (as ok: false) rather than creating an account if this Google
// sign-in has never completed an invite redemption — that's still the only account-creation path.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`invite-signin:${ip}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts — wait a minute and try again." }, { status: 429 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const result = await signInReturningPatient(userId);
  if (!result.ok) {
    return NextResponse.json({ error: "No account found for that sign-in." }, { status: 404 });
  }
  return NextResponse.json({ patientId: result.patientId, patientFirstName: result.patientFirstName });
}
