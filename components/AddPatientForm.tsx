"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Result = { patientId: string; code: string; expiresAt: string };

export default function AddPatientForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function submit() {
    const ageNum = Number(age);
    if (!name.trim() || !Number.isFinite(ageNum) || ageNum <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), age: ageNum }),
      });
      if (res.ok) {
        setResult(await res.json());
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/signup?code=${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permissions can silently fail — the code is still visible to copy by hand
    }
  }

  function close() {
    setOpen(false);
    setName("");
    setAge("");
    setResult(null);
    setCopied(false);
  }

  if (!open) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn primary" onClick={() => setOpen(true)}>
          <i className="ph-bold ph-plus" /> Add patient
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {result ? (
        <>
          <h2>
            <i className="ph ph-check-circle ic-primary" /> {name} is on your caseload
          </h2>
          <p className="sub" style={{ margin: "0 0 12px" }}>
            Send this link to {name.split(" ")[0]} — it opens straight to sign-up, no code to type.
          </p>
          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button className="btn primary sm" onClick={() => copyLink(result.code)}>
              <i className={`ph ${copied ? "ph-check" : "ph-link"}`} /> {copied ? "Link copied" : "Copy invite link"}
            </button>
          </div>
          <p className="sub" style={{ margin: "0 0 4px", fontSize: 12.5 }}>
            Or give them the code directly:{" "}
            <code style={{ fontWeight: 700, letterSpacing: "0.04em" }}>{result.code}</code>
          </p>
          <p className="sub" style={{ margin: "0 0 16px", fontSize: 12.5 }}>
            Expires {new Date(result.expiresAt).toLocaleDateString()}
          </p>
          <div className="btn-row">
            <button className="btn" onClick={close}>Done</button>
            <Link className="btn primary" href={`/patients/${result.patientId}`}>
              View profile <i className="ph-bold ph-arrow-right" />
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2>
            <i className="ph ph-user-plus ic-primary" /> Add a patient
          </h2>
          <p className="sub" style={{ margin: "0 0 12px" }}>
            Name and age is all it takes — a sign-up code is generated right after.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field-row" style={{ flex: 2 }}>
              <label className="field-label" htmlFor="new-patient-name">Name</label>
              <input
                id="new-patient-name" className="field" autoFocus
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="field-row" style={{ flex: 1 }}>
              <label className="field-label" htmlFor="new-patient-age">Age</label>
              <input
                id="new-patient-age" type="number" min="0" className="field"
                value={age} onChange={(e) => setAge(e.target.value)}
              />
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn" disabled={submitting} onClick={close}>Cancel</button>
            <button className="btn primary" disabled={submitting || !name.trim() || !age} onClick={submit}>
              {submitting ? "Creating…" : "Create & send invite"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
