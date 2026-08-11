/**
 * Session issuance for the patient invite-redemption flow. An opaque random token, stored
 * server-side in the `sessions` table and referenced by an httpOnly cookie (er-design.md
 * §Part 1 Decision 2). Dietitian auth moved to Clerk (see lib/clerk.ts) — this module and its
 * `sessions` table are patient-only now; a dietitian User row never gets a Session here.
 */
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
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
