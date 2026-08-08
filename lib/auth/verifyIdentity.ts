/**
 * Identity verification for the patient sign-up step — mocked. No Auth0 tenant is
 * configured in this environment (needs AUTH0_DOMAIN/AUTH0_CLIENT_ID/AUTH0_CLIENT_SECRET),
 * so this accepts whatever the patient submitted directly, with no external OAuth or SMS
 * OTP call.
 *
 * This is the ONLY function that needs to change once real Auth0 credentials exist: swap
 * the body for an Auth0 SDK callback + ID-token verification (extracting the `sub` claim
 * as the real identity, Google profile fields on the federated path). Everything around it
 * — invite validation, the `users` row, session creation — stays the same.
 */
export type VerifiedIdentity = {
  provider: "mock";
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

export async function verifyIdentity(input: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}): Promise<VerifiedIdentity> {
  return { provider: "mock", ...input };
}
