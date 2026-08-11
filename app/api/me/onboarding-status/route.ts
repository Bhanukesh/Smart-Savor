import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getOnboardingStatus } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/me/onboarding-status — the signed-in patient's own nav-badge state (PortalNav).
// Scoped entirely by session, not a URL :id, so there's nothing to authorize against beyond
// "is there a valid patient session" — the response can never be about anyone else.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "patient" || !sessionUser.patientId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const status = await getOnboardingStatus(sessionUser.patientId);
  return NextResponse.json(status);
}
