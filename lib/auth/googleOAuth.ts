/**
 * Real Google Sign-In for patient invite signup — a direct OAuth2 client, not Clerk. Clerk's
 * dietitian app runs in Restricted mode (only invited emails can create an account there at
 * all), which is exactly wrong for patients: they're already gated by the invite *code*
 * before this ever runs, and sharing one Clerk app between the two would mean turning
 * Restricted mode off, removing the only protection the dietitian side has. See lib/clerk
 * usage in proxy.ts for that side; this is deliberately separate.
 */
import { OAuth2Client } from "google-auth-library";

export function getGoogleOAuthClient(origin: string): OAuth2Client | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: `${origin}/api/invite/google/callback`,
  });
}
