/**
 * Dietitian ↔ Clerk account linking. Restricted mode on the Clerk side guarantees only
 * invited emails can ever create an account there — this module is the app-side half: turning
 * "a Clerk account just signed in with this email" into "which Dietitian/User row is that."
 *
 * Two ways a User row becomes claimable, both funnel through findLinkedDietitianUser()/
 * claimOpenSeat():
 *  - Bootstrap: prisma/seed.ts pre-creates an "open seat" (role=dietitian, email set,
 *    clerkUserId null) for the practice's first account.
 *  - Colleague invite: createColleagueInvitation() below asks Clerk to invite a specific
 *    email, carrying practiceId/colleagueName as invitation publicMetadata. The webhook
 *    (app/api/webhooks/clerk/route.ts) creates the Dietitian + User row once that person
 *    actually signs up, using that metadata — no row exists to "claim" until then.
 */
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

// dietitianId narrowed to non-null: every DietitianUser returned below came from a row where
// the `dietitian` relation resolved, which Prisma can only do when dietitianId is set.
export type DietitianUser = Omit<User, "dietitianId"> & {
  dietitianId: string;
  dietitianName: string;
  practiceId: string;
};

/** The dietitian-side equivalent of getSessionUser() (lib/auth/session.ts) — for Server
 * Components/Route Handlers downstream of proxy.ts, which has already confirmed a linked
 * account exists. Re-checks anyway (cheap, same defense-in-depth as the patient side) rather
 * than trusting that proxy.ts ran. */
export async function getSessionDietitian(): Promise<DietitianUser | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return findLinkedDietitianUser(userId);
}

/** Fast path — no Clerk API call, just the JWT's userId against our DB. What proxy.ts checks
 * on every dietitian-gated request once a Clerk account is actually linked. */
export async function findLinkedDietitianUser(clerkUserId: string): Promise<DietitianUser | null> {
  const user = await prisma.user.findUnique({ where: { clerkUserId }, include: { dietitian: true } });
  if (!user || user.role !== "dietitian" || !user.dietitian) return null;
  return { ...user, dietitianId: user.dietitian.id, dietitianName: user.dietitian.name, practiceId: user.dietitian.practiceId };
}

/** Slow path — only reached when findLinkedDietitianUser() misses, i.e. at most once per
 * dietitian (their first request after Clerk creates the account). Claims an open seat by
 * email; returns null if none matches (not a pre-provisioned bootstrap seat, and the webhook
 * hasn't created one for them either — shouldn't happen under Restricted mode, but a Clerk
 * session alone is never sufficient on its own). */
export async function claimOpenSeat(clerkUserId: string, email: string): Promise<DietitianUser | null> {
  const openSeat = await prisma.user.findFirst({
    where: { role: "dietitian", email: email.trim().toLowerCase(), clerkUserId: null },
    include: { dietitian: true },
  });
  if (!openSeat || !openSeat.dietitian) return null;
  const user = await prisma.user.update({
    where: { id: openSeat.id },
    data: { clerkUserId, lastLoginAt: new Date() },
    include: { dietitian: true },
  });
  return {
    ...user,
    dietitianId: user.dietitian!.id,
    dietitianName: user.dietitian!.name,
    practiceId: user.dietitian!.practiceId,
  };
}

/** Dietitian-console action: invite a colleague by email. Creates their Dietitian row now
 * (name only, like createPatient() does for a new patient) so the practice roster shows them
 * immediately as "pending"; the User row (and the Clerk-side account) doesn't exist until they
 * accept. publicMetadata carries what the webhook needs to find that Dietitian row again. */
export async function createColleagueInvitation(
  issuedByDietitianId: string,
  name: string,
  email: string,
): Promise<{ dietitianId: string; name: string } | null> {
  const issuer = await prisma.dietitian.findUnique({ where: { id: issuedByDietitianId } });
  if (!issuer) return null;

  const dietitian = await prisma.dietitian.create({
    // email is a required column but unused/cosmetic in practice (see User.email for the
    // real, unique login identity) — left blank until this becomes worth a schema change.
    data: { practiceId: issuer.practiceId, name: name.trim(), email: "" },
  });

  const client = await clerkClient();
  await client.invitations.createInvitation({
    emailAddress: email.trim().toLowerCase(),
    publicMetadata: { pendingDietitianId: dietitian.id },
  });

  return { dietitianId: dietitian.id, name: dietitian.name };
}

/** Practice roster for the /team page: everyone with a Dietitian row in the same practice,
 * plus whether they've actually signed in yet (a User row with clerkUserId set) or are still
 * a pending invite (Dietitian row exists, no linked/claimed User yet). */
export async function listPracticeColleagues(practiceId: string) {
  const dietitians = await prisma.dietitian.findMany({
    where: { practiceId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return dietitians.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.user?.email ?? null,
    status: d.user?.clerkUserId ? ("active" as const) : ("pending" as const),
  }));
}
