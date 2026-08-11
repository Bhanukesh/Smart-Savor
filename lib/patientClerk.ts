/**
 * The patient-facing Clerk application — deliberately separate from the dietitian one
 * (lib/auth/dietitian.ts). The dietitian app runs in Restricted mode (no account without an
 * invitation); patients are already gated by their own invite *code* before they ever see a
 * sign-in screen, so this app is left unrestricted on purpose — sharing one Clerk app between
 * the two would mean turning Restricted mode off, removing the only protection the dietitian
 * side has, since nothing else backs that gate up. See proxy.ts's clerkMiddleware key
 * resolver for how requests get routed to the right app's keys, and app/invite/claim for
 * where a signed-in-via-this-app identity actually gets consumed.
 */
import { createClerkClient } from "@clerk/nextjs/server";

export const PATIENT_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PATIENT_CLERK_PUBLISHABLE_KEY;
export const PATIENT_CLERK_SECRET_KEY = process.env.PATIENT_CLERK_SECRET_KEY;

/** For backend-only calls (e.g. createInvitation from the dietitian's "Add patient" flow,
 * which runs in a request scoped to the *dietitian* Clerk app) — explicit, not the ambient
 * auth()/clerkClient() from @clerk/nextjs/server, which reflects whichever app the current
 * request's middleware resolved to. */
export function getPatientClerkClient() {
  if (!PATIENT_CLERK_SECRET_KEY || !PATIENT_CLERK_PUBLISHABLE_KEY) return null;
  return createClerkClient({ secretKey: PATIENT_CLERK_SECRET_KEY, publishableKey: PATIENT_CLERK_PUBLISHABLE_KEY });
}

/** Send a patient a Clerk-hosted sign-up invitation by email — this is the entire "invite
 * delivery" mechanism now (no Resend, no Twilio): Clerk sends the email itself. redirectUrl
 * lands them on our own app/invite/claim page, already signed in, once they accept. */
export async function invitePatientByEmail(
  email: string,
  redirectUrl: string,
  publicMetadata: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const client = getPatientClerkClient();
  if (!client) {
    console.error("[patientClerk] NEXT_PUBLIC_PATIENT_CLERK_PUBLISHABLE_KEY/PATIENT_CLERK_SECRET_KEY not set — invite email not sent.");
    return { ok: false, error: "not_configured" };
  }
  try {
    await client.invitations.createInvitation({ emailAddress: email, redirectUrl, publicMetadata, ignoreExisting: true });
    return { ok: true };
  } catch (err) {
    console.error("[patientClerk] failed to send invite email:", err);
    return { ok: false, error: "send_failed" };
  }
}
