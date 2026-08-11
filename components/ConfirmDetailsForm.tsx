"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmDetailsForm({
  code,
  initialFirstName,
  initialLastName,
}: {
  code: string;
  initialFirstName: string;
  initialLastName: string;
}) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [age, setAge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ageNum = Number(age);
    if (!firstName.trim() || !Number.isFinite(ageNum) || ageNum <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invite/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          age: ageNum,
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
      {(initialFirstName || initialLastName) && (
        <p className="sub" style={{ margin: "0 0 16px" }}>
          Pulled from your Google account — change anything that&apos;s not right.
        </p>
      )}

      <div className="field-row">
        <label className="field-label" htmlFor="fname">First name</label>
        <input id="fname" className="field" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus={!firstName} />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor="lname">Last name</label>
        <input id="lname" className="field" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor="age">Age</label>
        <input
          id="age" type="number" min="0" className="field" autoFocus={!!firstName}
          value={age} onChange={(e) => setAge(e.target.value)}
        />
      </div>

      {error && (
        <p className="note" style={{ marginTop: 4 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}

      <button className="btn primary" type="submit" disabled={submitting || !firstName.trim() || !age} style={{ width: "100%", marginTop: 6 }}>
        {submitting ? "Activating…" : "Activate my account"} <i className="ph-bold ph-arrow-right" />
      </button>
    </form>
  );
}
