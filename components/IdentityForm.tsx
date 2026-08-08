"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IdentityForm({ code }: { code: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          identity: {
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't activate your account.");
      router.push(`/invite/welcome?name=${encodeURIComponent(data.patientFirstName)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't activate your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card pad-lg">
      <h2>
        <i className="ph ph-user ic-primary" /> A couple details
      </h2>
      <p className="sub" style={{ margin: "0 0 16px" }}>
        This stands in for Google or phone sign-in until real Auth0 is wired in — for now, just
        tell us who you are.
      </p>

      <div className="field-row">
        <label className="field-label" htmlFor="fname">First name</label>
        <input id="fname" className="field" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor="lname">Last name</label>
        <input id="lname" className="field" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor="email">Email (optional)</label>
        <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor="phone">Mobile number (optional)</label>
        <input id="phone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      {error && (
        <p className="note" style={{ marginTop: 4 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}

      <button className="btn primary" type="submit" disabled={submitting || !firstName.trim()} style={{ width: "100%", marginTop: 6 }}>
        {submitting ? "Activating…" : "Activate my account"} <i className="ph-bold ph-arrow-right" />
      </button>
    </form>
  );
}
