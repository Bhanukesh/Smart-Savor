import { NextResponse } from "next/server";
import crypto from "crypto";
import { getGoogleOAuthClient } from "@/lib/auth/googleOAuth";
import { checkInviteCode } from "@/lib/invite";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "smartsavor_oauth_state";

// GET /api/invite/google/start?code=<invite code> — kicks off Google sign-in for the invite
// signup flow. Re-checks the invite code before ever redirecting to Google, same as
// checkInviteCode() already gates app/invite/signup — nothing about this endpoint changes
// who's allowed in.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const inviteCode = url.searchParams.get("code");
  if (!inviteCode) return NextResponse.redirect(new URL("/invite", req.url));

  const check = await checkInviteCode(inviteCode);
  if (!check.valid) return NextResponse.redirect(new URL("/invite", req.url));

  const client = getGoogleOAuthClient(url.origin);
  if (!client) {
    return NextResponse.redirect(
      new URL(`/invite/signup?code=${encodeURIComponent(inviteCode)}&error=google_not_configured`, req.url),
    );
  }

  const csrfToken = crypto.randomBytes(16).toString("hex");
  const authUrl = client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state: `${csrfToken}.${inviteCode}`,
  });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
