/**
 * Session issuance for the invite-redemption flow. An opaque random token, stored server-
 * side in the `sessions` table and referenced by an httpOnly cookie — the same shape as the
 * dietitian session (er-design.md §Part 1 Decision 2), so both sides stay uniform once
 * dietitian auth lands.
 */
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

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
