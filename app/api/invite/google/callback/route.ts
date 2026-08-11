import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleOAuthClient } from "@/lib/auth/googleOAuth";
import { checkInviteCode } from "@/lib/invite";
import { setPendingIdentity } from "@/lib/invitePendingIdentity";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "smartsavor_oauth_state";

// GET /api/invite/google/callback — Google redirects here after consent. Exchanges the code,
// verifies the ID token's signature (not just decodes it — a forged/tampered token fails
// here), then stashes the verified identity in a short-lived cookie for
// app/invite/details to pick up. Nothing about the patient's account is created yet — that's
// app/api/invite/finish, once they've confirmed their name/age.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const googleCode = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const [csrfToken, inviteCode] = state.split(".");

  const jar = await cookies();
  const expectedCsrf = jar.get(STATE_COOKIE)?.value;

  if (!googleCode || !inviteCode || !csrfToken || csrfToken !== expectedCsrf) {
    return NextResponse.redirect(new URL("/invite", req.url));
  }

  const check = await checkInviteCode(inviteCode);
  if (!check.valid) return NextResponse.redirect(new URL("/invite", req.url));

  const client = getGoogleOAuthClient(url.origin);
  if (!client) {
    return NextResponse.redirect(
      new URL(`/invite/signup?code=${encodeURIComponent(inviteCode)}&error=google_not_configured`, req.url),
    );
  }

  try {
    const { tokens } = await client.getToken(googleCode);
    if (!tokens.id_token) throw new Error("no id_token in Google's response");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error("verified token missing sub/email");

    await setPendingIdentity({
      provider: "google",
      inviteCode,
      googleUserId: payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
    });
  } catch (err) {
    console.error("[invite/google/callback] failed:", err);
    return NextResponse.redirect(
      new URL(`/invite/signup?code=${encodeURIComponent(inviteCode)}&error=google_failed`, req.url),
    );
  }

  const res = NextResponse.redirect(new URL(`/invite/details?code=${encodeURIComponent(inviteCode)}`, req.url));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
