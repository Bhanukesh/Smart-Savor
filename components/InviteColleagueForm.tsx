"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteColleagueForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (res.ok) {
        setSent(true);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.formErrors?.[0] ?? "Couldn't send the invite.");
      }
    } catch {
      setError("Couldn't send the invite — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setName("");
    setEmail("");
    setSent(false);
    setError(null);
  }

  if (!open) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn primary" onClick={() => setOpen(true)}>
          <i className="ph-bold ph-plus" /> Invite colleague
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {sent ? (
        <>
          <h2>
            <i className="ph ph-check-circle ic-primary" /> Invite sent
          </h2>
          <p className="sub" style={{ margin: "0 0 16px" }}>
            {name.split(" ")[0]} will get an email at {email} with a Google/Microsoft sign-in
            link — it only works for that exact address.
          </p>
          <button className="btn" onClick={close}>Done</button>
        </>
      ) : (
        <>
          <h2>
            <i className="ph ph-user-plus ic-primary" /> Invite a colleague
          </h2>
          <p className="sub" style={{ margin: "0 0 12px" }}>
            Name and email is all it takes — Clerk sends the sign-in invite.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field-row" style={{ flex: 1 }}>
              <label className="field-label" htmlFor="new-colleague-name">Name</label>
              <input
                id="new-colleague-name" className="field" autoFocus
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="field-row" style={{ flex: 1 }}>
              <label className="field-label" htmlFor="new-colleague-email">Email</label>
              <input
                id="new-colleague-email" type="email" className="field"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </div>
          </div>
          {error && (
            <p className="note" style={{ marginTop: 8 }}>
              <i className="ph ph-warning-circle ic-primary" /> {error}
            </p>
          )}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn" disabled={submitting} onClick={close}>Cancel</button>
            <button className="btn primary" disabled={submitting || !name.trim() || !email.trim()} onClick={submit}>
              {submitting ? "Sending…" : "Send invite"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
