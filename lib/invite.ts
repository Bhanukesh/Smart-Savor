/**
 * Invite-code gate + sign-up — er-design.md §Part 1, Decisions 2-3. The code is the only
 * gate: identity verification runs only after a valid, unexpired, unredeemed code is
 * presented, and only ever reaches redeemInvite() once it's actually happened.
 *
 * Both web (app/invite/claim) and mobile/ (app/(auth)/details.tsx) verify identity via a real
 * Google sign-in through a separate, unrestricted patient Clerk app (see lib/patientClerk.ts)
 * before ever calling this with a real email/googleUserId — never a mock on either platform.
 */
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
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
  | { ok: false; error: "not_found" | "already_redeemed" | "expired" | "identity_already_linked" };

export async function redeemInvite(
  code: string,
  identity: { email?: string; phone?: string; googleUserId?: string; firstName?: string; lastName?: string },
  age?: number,
): Promise<RedeemResult> {
  const invite = await prisma.patientInvite.findUnique({ where: { code }, include: { patient: true } });
  if (!invite) return { ok: false, error: "not_found" };
  if (invite.redeemedAt) return { ok: false, error: "already_redeemed" };
  if (invite.expiresAt < new Date()) return { ok: false, error: "expired" };

  // email/googleUserId are @unique on User — the same Google account (or address) redeeming a
  // second invite for a *different* patientId would otherwise throw an unhandled Prisma P2002
  // here (a 500, not a real error message). Not hypothetical: this is exactly what repeated
  // manual testing with one real Google account across several test patients hits.
  let user;
  try {
    user = await prisma.user.upsert({
      where: { patientId: invite.patientId },
      create: {
        role: "patient",
        patientId: invite.patientId,
        email: identity.email,
        phone: identity.phone,
        googleUserId: identity.googleUserId,
      },
      update: {
        ...(identity.email ? { email: identity.email } : {}),
        ...(identity.phone ? { phone: identity.phone } : {}),
        ...(identity.googleUserId ? { googleUserId: identity.googleUserId } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "identity_already_linked" };
    }
    throw err;
  }

  await prisma.patientInvite.update({ where: { id: invite.id }, data: { redeemedAt: new Date() } });
  // The dietitian's age at "Add patient" time is a rough placeholder; whatever the patient
  // confirms/enters at signup is the real value.
  if (age !== undefined) {
    await prisma.patient.update({ where: { id: invite.patientId }, data: { age } });
  }
  await createSession(user.id);

  return { ok: true, patientId: invite.patientId, patientFirstName: invite.patient.name.split(" ")[0] };
}

export type SignInResult =
  | { ok: true; patientId: string; patientFirstName: string }
  | { ok: false };

/** Returning-patient sign-in — no invite code involved. A patient's invite code is single-use
 * (redeemInvite marks it redeemedAt on first use), so logging out on mobile or losing the web
 * session cookie previously left no way back in at all: the only entry point was /invite's code
 * form, and a redeemed code is permanently rejected by checkInviteCode. This looks the caller's
 * *already-verified* Clerk identity (same googleUserId redeemInvite stored at signup) up against
 * an existing patient account and signs them back in — it never creates one. */
export async function signInReturningPatient(googleUserId: string): Promise<SignInResult> {
  const user = await prisma.user.findUnique({ where: { googleUserId }, include: { patient: true } });
  if (!user || user.role !== "patient" || !user.patient) return { ok: false };
  await createSession(user.id);
  return { ok: true, patientId: user.patient.id, patientFirstName: user.patient.name.split(" ")[0] };
}

function randomInviteCode(patientName: string): string {
  const prefix = (patientName.split(" ")[0].match(/[A-Za-z]/g) ?? []).slice(0, 4).join("").toUpperCase() || "PT";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export type InviteStatus = {
  hasAccount: boolean;
  invite: { code: string; expiresAt: string; redeemedAt: string | null } | null;
};

/** Dietitian-facing view of a patient's onboarding state — for the "Invite" panel on their
 * profile. Still surfaces the code/redemption date once a User row exists (invite redeemed) —
 * it used to disappear entirely at that point, which read as a bug to a dietitian checking
 * whether a code they'd just handed out actually got used (see InvitePanel.tsx). */
export async function getInviteStatus(patientId: string): Promise<InviteStatus | null> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { user: true, invite: true },
  });
  if (!patient) return null;
  const hasAccount = !!patient.user;
  if (!patient.invite) return { hasAccount, invite: null };
  return {
    hasAccount,
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
