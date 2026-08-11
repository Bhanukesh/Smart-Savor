/**
 * Twilio — invite delivery (plain SMS) and patient phone verification (Twilio Verify, real
 * OTP, not the old mocked "accepts whatever's submitted" identity). Same guarded-optional
 * pattern as every other external API key in this repo (see ANTHROPIC_API_KEY,
 * CLERK_SECRET_KEY): missing config logs clearly and degrades gracefully — an invite SMS that
 * can't send still leaves the dietitian with a copyable link (see InvitePanel.tsx), and OTP
 * routes return a clear "not configured" error rather than crashing.
 */
import twilio from "twilio";

function getClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !authToken) return null;
  return twilio(sid, authToken);
}

export async function sendInviteSms(
  phone: string,
  patientFirstName: string,
  issuedByDietitianName: string,
  inviteLink: string,
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!client || !fromNumber) {
    console.error("[sms] TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER not set — invite SMS not sent.");
    return { ok: false, error: "not_configured" };
  }
  try {
    await client.messages.create({
      body: `Hi ${patientFirstName}, ${issuedByDietitianName} invited you to Smart Savor. Finish signing up: ${inviteLink}`,
      to: phone,
      from: fromNumber,
    });
    return { ok: true };
  } catch (err) {
    console.error("[sms] failed to send invite SMS:", err);
    return { ok: false, error: "send_failed" };
  }
}

export async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!client || !serviceSid) {
    console.error("[sms] TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_VERIFY_SERVICE_SID not set — OTP not sent.");
    return { ok: false, error: "not_configured" };
  }
  try {
    await client.verify.v2.services(serviceSid).verifications.create({ to: phone, channel: "sms" });
    return { ok: true };
  } catch (err) {
    console.error("[sms] failed to send OTP:", err);
    return { ok: false, error: "send_failed" };
  }
}

export async function checkOtp(phone: string, code: string): Promise<boolean> {
  const client = getClient();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!client || !serviceSid) {
    console.error("[sms] TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_VERIFY_SERVICE_SID not set — cannot check OTP.");
    return false;
  }
  try {
    const check = await client.verify.v2.services(serviceSid).verificationChecks.create({ to: phone, code });
    return check.status === "approved";
  } catch (err) {
    console.error("[sms] failed to check OTP:", err);
    return false;
  }
}
