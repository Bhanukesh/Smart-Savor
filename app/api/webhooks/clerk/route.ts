import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/db";
import { claimOpenSeat } from "@/lib/auth/dietitian";

export const dynamic = "force-dynamic";

// POST /api/webhooks/clerk — Clerk calls this, not a browser. Signature-verified (not
// cookie/session-authenticated) via CLERK_WEBHOOK_SIGNING_SECRET; proxy.ts leaves this path
// ungated on purpose (see its comments) since neither the patient cookie nor a dietitian Clerk
// session applies to a server-to-server call.
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("[clerk webhook] signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (evt.type !== "user.created") {
    return NextResponse.json({ ok: true, skipped: evt.type });
  }

  const clerkUserId = evt.data.id;
  const email = evt.data.email_addresses.find((e) => e.id === evt.data.primary_email_address_id)
    ?.email_address;
  if (!email) {
    console.error(`[clerk webhook] user.created for ${clerkUserId} has no primary email — cannot link.`);
    return NextResponse.json({ ok: true, linked: false });
  }

  // Case 1: a pre-provisioned bootstrap seat (prisma/seed.ts) matching this exact email.
  const claimed = await claimOpenSeat(clerkUserId, email);
  if (claimed) {
    console.log(`[clerk webhook] claimed open seat for ${email} (dietitian ${claimed.dietitianId}).`);
    return NextResponse.json({ ok: true, linked: true, via: "open_seat" });
  }

  // Case 2: a colleague invited via /team — createColleagueInvitation() stamped the target
  // Dietitian row's id onto the invitation's publicMetadata, which Clerk carries onto the
  // resulting user.
  const pendingDietitianId = evt.data.public_metadata?.pendingDietitianId;
  if (typeof pendingDietitianId === "string") {
    const dietitian = await prisma.dietitian.findUnique({ where: { id: pendingDietitianId } });
    const alreadyLinked = dietitian ? await prisma.user.findUnique({ where: { dietitianId: dietitian.id } }) : null;
    if (dietitian && !alreadyLinked) {
      await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          clerkUserId,
          role: "dietitian",
          dietitianId: dietitian.id,
          lastLoginAt: new Date(),
        },
      });
      console.log(`[clerk webhook] created dietitian account for ${email} (dietitian ${dietitian.id}).`);
      return NextResponse.json({ ok: true, linked: true, via: "colleague_invite" });
    }
  }

  // Restricted mode should make this unreachable (only invited emails can sign up at all) —
  // but a dashboard-invited-without-our-metadata user, or a race, lands here. Not fatal: they
  // just see /login/dietitian/no-access until an open seat or invite actually exists for them.
  console.error(`[clerk webhook] user.created for ${email} (${clerkUserId}) matched no open seat or pending invite.`);
  return NextResponse.json({ ok: true, linked: false });
}
