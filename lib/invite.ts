/**
 * Invite-code gate + sign-up — er-design.md §Part 1, Decisions 2-3. The code is the only
 * gate: identity verification (verifyIdentity, mocked this increment) only ever runs after
 * a valid, unexpired, unredeemed code is presented.
 */
import crypto from "crypto";
import { prisma } from "./db";
import { verifyIdentity } from "./auth/verifyIdentity";
import { createSession } from "./auth/session";

export type InviteCheck =
  | { valid: true; patientFirstName: string; issuedByDietitianName: string }
  | { valid: false };

export async function checkInviteCode(code: string): Promise<InviteCheck> {
  const invite = await prisma.patientInvite.findUnique({
    where: { code },
    include: { patient: true, issuedByDietitian: true },
  });
  if (!invite || invite.redeemedAt || invite.expiresAt < new Date()) return { valid: false };
  return {
    valid: true,
    patientFirstName: invite.patient.name.split(" ")[0],
    issuedByDietitianName: invite.issuedByDietitian.name,
  };
}

export type RedeemResult =
  | { ok: true; patientId: string; patientFirstName: string }
  | { ok: false; error: "not_found" | "already_redeemed" | "expired" };

export async function redeemInvite(
  code: string,
  identity: { email?: string; phone?: string; firstName?: string; lastName?: string },
): Promise<RedeemResult> {
  const invite = await prisma.patientInvite.findUnique({ where: { code }, include: { patient: true } });
  if (!invite) return { ok: false, error: "not_found" };
  if (invite.redeemedAt) return { ok: false, error: "already_redeemed" };
  if (invite.expiresAt < new Date()) return { ok: false, error: "expired" };

  const verified = await verifyIdentity(identity);

  const user = await prisma.user.upsert({
    where: { patientId: invite.patientId },
    create: {
      role: "patient",
      patientId: invite.patientId,
      email: verified.email,
      phone: verified.phone,
      // Placeholder — a real Auth0 `sub` claim replaces this once verifyIdentity() is real.
      auth0UserId: `mock_${invite.patientId}`,
    },
    update: {
      ...(verified.email ? { email: verified.email } : {}),
      ...(verified.phone ? { phone: verified.phone } : {}),
    },
  });

  await prisma.patientInvite.update({ where: { id: invite.id }, data: { redeemedAt: new Date() } });
  await createSession(user.id);

  return { ok: true, patientId: invite.patientId, patientFirstName: invite.patient.name.split(" ")[0] };
}

function randomInviteCode(patientName: string): string {
  const prefix = (patientName.split(" ")[0].match(/[A-Za-z]/g) ?? []).slice(0, 4).join("").toUpperCase() || "PT";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export type InviteStatus =
  | { hasAccount: true }
  | { hasAccount: false; invite: { code: string; expiresAt: string; redeemedAt: string | null } | null };

/** Dietitian-facing view of a patient's onboarding state — for the "Send invite" panel on
 * their profile. Once a User row exists (invite redeemed), there's nothing left to invite. */
export async function getInviteStatus(patientId: string): Promise<InviteStatus | null> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { user: true, invite: true },
  });
  if (!patient) return null;
  if (patient.user) return { hasAccount: true };
  if (!patient.invite) return { hasAccount: false, invite: null };
  return {
    hasAccount: false,
    invite: {
      code: patient.invite.code,
      expiresAt: patient.invite.expiresAt.toISOString(),
      redeemedAt: patient.invite.redeemedAt?.toISOString() ?? null,
    },
  };
}

/** Dietitian action: "Send invite" — mints a fresh unique code for this patient, good for 14
 * days. Safe to call again before redemption (regenerates); a redeemed invite blocks callers
 * upstream via getInviteStatus's hasAccount check, since there's nothing left to (re-)send. */
export async function generateInviteForPatient(
  patientId: string,
): Promise<{ code: string; expiresAt: string } | null> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || !patient.dietitianId) return null;

  let code = randomInviteCode(patient.name);
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.patientInvite.findUnique({ where: { code } });
    if (!clash) break;
    code = randomInviteCode(patient.name);
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const invite = await prisma.patientInvite.upsert({
    where: { patientId },
    create: { patientId, code, issuedBy: patient.dietitianId, expiresAt },
    update: { code, issuedBy: patient.dietitianId, expiresAt, redeemedAt: null },
  });
  return { code: invite.code, expiresAt: invite.expiresAt.toISOString() };
}
