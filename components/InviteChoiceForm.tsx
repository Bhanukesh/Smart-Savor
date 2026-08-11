"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "choose" | "phone-entry" | "otp-entry";

const GOOGLE_ERROR_MESSAGE: Record<string, string> = {
  google_not_configured: "Google sign-in isn't available right now — try your phone number instead.",
  google_failed: "Google sign-in didn't go through — try again, or use your phone number.",
};

export default function InviteChoiceForm({ code, googleError }: { code: string; googleError?: string }) {
  const [step, setStep] = useState<Step>("choose");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(googleError ? GOOGLE_ERROR_MESSAGE[googleError] ?? null : null);
  const router = useRouter();

  async function sendOtp() {
    if (!phone.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invite/phone/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't send a code.");
      setStep("otp-entry");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send a code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invite/phone/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, phone: phone.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't verify that code.");
      router.push(`/invite/details?code=${encodeURIComponent(code)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify that code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card pad-lg">
      <h2>
        <i className="ph ph-user ic-primary" /> How do you want to sign in?
      </h2>

      {step === "choose" && (
        <>
          <p className="sub" style={{ margin: "0 0 16px" }}>
            Pick whichever's easiest — both work the same way after this.
          </p>
          <a href={`/api/invite/google/start?code=${encodeURIComponent(code)}`} className="btn primary" style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
            <i className="ph ph-google-logo" /> Continue with Google
          </a>
          <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => setStep("phone-entry")}>
            <i className="ph ph-device-mobile" /> Use my phone number
          </button>
        </>
      )}

      {step === "phone-entry" && (
        <>
          <p className="sub" style={{ margin: "0 0 16px" }}>
            We&apos;ll text a code to verify it&apos;s you.
          </p>
          <div className="field-row">
            <label className="field-label" htmlFor="phone">Mobile number</label>
            <input
              id="phone" type="tel" className="field" autoFocus
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 0100"
            />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn" disabled={submitting} onClick={() => setStep("choose")}>Back</button>
            <button className="btn primary" disabled={submitting || !phone.trim()} onClick={sendOtp}>
              {submitting ? "Sending…" : "Send code"}
            </button>
          </div>
        </>
      )}

      {step === "otp-entry" && (
        <>
          <p className="sub" style={{ margin: "0 0 16px" }}>
            Enter the code we texted to {phone}.
          </p>
          <div className="field-row">
            <label className="field-label" htmlFor="otp">Verification code</label>
            <input
              id="otp" inputMode="numeric" className="field" autoFocus
              value={otp} onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
            />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn" disabled={submitting} onClick={() => setStep("phone-entry")}>Back</button>
            <button className="btn primary" disabled={submitting || !otp.trim()} onClick={verifyOtp}>
              {submitting ? "Verifying…" : "Verify"}
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="note" style={{ marginTop: 12 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}
    </div>
  );
}
