/**
 * Session issuance for the invite-redemption flow. An opaque random token, stored server-
 * side in the `sessions` table and referenced by an httpOnly cookie — the same shape as the
 * dietitian session (er-design.md §Part 1 Decision 2), so both sides stay uniform once
 * dietitian auth lands.
 */
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPassword } from "./password";
import type { UserRole } from "@prisma/client";

const COOKIE_NAME = "smartsavor_session";
const SESSION_TTL_DAYS = 30;

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400000);
  await prisma.session.create({ data: { userId, token, expiresAt } });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  jar.delete(COOKIE_NAME);
}

export type SessionUser = { id: string; role: UserRole; dietitianId: string | null; patientId: string | null };

/** Reads the session cookie from the current request and returns the signed-in user, or null
 * if there's no cookie, no matching row, or the session has expired. Used by Server
 * Components/Route Handlers that need the real user, not just "is there a cookie" — proxy.ts
 * does its own lookup (it can't call next/headers' cookies() the same way), this is for
 * everything downstream of it. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  const { user } = session;
  return { id: user.id, role: user.role, dietitianId: user.dietitianId, patientId: user.patientId };
}

export { COOKIE_NAME };

export type DietitianLoginResult =
  | { ok: true; dietitianName: string }
  | { ok: false; error: "invalid_credentials" };

/** Dietitian login — /login/dietitian's only entry point into a session. Deliberately generic
 * on failure (no "no such email" vs "wrong password" distinction) so this can't be used to
 * enumerate registered emails. */
export async function loginDietitian(email: string, password: string): Promise<DietitianLoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { dietitian: true },
  });
  if (!user || user.role !== "dietitian" || !user.passwordHash || !user.dietitian) {
    return { ok: false, error: "invalid_credentials" };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, error: "invalid_credentials" };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  return { ok: true, dietitianName: user.dietitian.name };
}
