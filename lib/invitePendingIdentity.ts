/**
 * Short-lived bridge between "identity verified" (Google callback, or Twilio OTP check) and
 * "patient confirms name/age and finishes signing up" (app/invite/details) — two separate
 * requests, since the confirm-details step needs a human in the loop. An httpOnly, HMAC-signed
 * cookie carries the verified identity between them so the final redemption
 * (app/api/invite/finish) never has to trust anything about *who* the client claims to be —
 * only what's in this cookie, which only our own server ever wrote.
 *
 * Signed with a per-process secret generated at module load, not an env var: the cookie's
 * whole lifetime is minutes (one signup session), so a restart invalidating any in-flight one
 * is an acceptable, rare edge case — not worth another secret for the deploy checklist.
 */
import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = crypto.randomBytes(32);
const COOKIE_NAME = "smartsavor_pending_identity";
const TTL_MS = 10 * 60 * 1000;

export type PendingIdentity =
  | { provider: "google"; inviteCode: string; googleUserId: string; email: string; firstName?: string; lastName?: string }
  | { provider: "phone_otp"; inviteCode: string; phone: string };

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export async function setPendingIdentity(identity: PendingIdentity): Promise<void> {
  const payload = JSON.stringify({ ...identity, exp: Date.now() + TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE_NAME, `${encoded}.${sign(encoded)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
}

export async function getPendingIdentity(): Promise<PendingIdentity | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [encoded, sig] = raw.split(".");
  if (!encoded || !sig || sign(encoded) !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload as PendingIdentity;
  } catch {
    return null;
  }
}

export async function clearPendingIdentity(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
