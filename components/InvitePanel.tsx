"use client";

import { useEffect, useState } from "react";

type Status = {
  hasAccount: boolean;
  invite: { code: string; expiresAt: string; redeemedAt: string | null } | null;
};

export default function InvitePanel({ patientId, patientFirstName }: { patientId: string; patientFirstName: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    setLoadError(false);
    fetch(`/api/patients/${patientId}/invite`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setStatus(data))
      .catch(() => setLoadError(true));
  }

  useEffect(load, [patientId]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/invite`, { method: "POST" });
      if (!res.ok) throw new Error();
      const invite = await res.json();
      setStatus({ hasAccount: false, invite: { ...invite, redeemedAt: null } });
      setCopied(false);
    } catch {
      setError("Couldn't generate an invite — try again.");
    } finally {
      setGenerating(false);
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

  if (loadError) {
    return (
      <div className="card">
        <h2>
          <i className="ph ph-warning-circle ic-primary" /> Invite
        </h2>
        <p className="sub" style={{ margin: "0 0 12px" }}>Couldn&apos;t load invite status.</p>
        <button className="btn" onClick={load}>Try again</button>
      </div>
    );
  }

  if (status === null) return null;

  const { hasAccount, invite } = status;
  const expired = invite ? new Date(invite.expiresAt) < new Date() : false;

  if (hasAccount) {
    return (
      <div className="card">
        <h2>
          <i className="ph ph-user-check ic-primary" /> Account
        </h2>
        <p className="sub" style={{ margin: invite ? "0 0 10px" : 0 }}>
          {patientFirstName} has already signed up and is using the app.
        </p>
        {invite && (
          <p className="sub" style={{ margin: 0, fontSize: 12.5 }}>
            Signed up with code <code style={{ fontWeight: 700, letterSpacing: "0.04em" }}>{invite.code}</code>
            {invite.redeemedAt && <> on {new Date(invite.redeemedAt).toLocaleDateString()}</>}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        <i className="ph ph-paper-plane-tilt ic-primary" /> Invite
      </h2>
      {!invite ? (
        <>
          <p className="sub" style={{ margin: "0 0 12px" }}>
            {patientFirstName}{" "}hasn&apos;t been sent a sign-up code yet.
          </p>
          <button className="btn primary" disabled={generating} onClick={generate}>
            {generating ? "Generating…" : "Send invite"} <i className="ph-bold ph-arrow-right" />
          </button>
          {error && (
            <p className="note" style={{ marginTop: 10 }}>
              <i className="ph ph-warning-circle ic-primary" /> {error}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="sub" style={{ margin: "0 0 10px" }}>
            {expired ? "This code expired — generate a new one." : `Send this link to ${patientFirstName} — it opens straight to sign-up, no code to type.`}
          </p>
          {!expired && (
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button className="btn primary sm" onClick={() => copyLink(invite.code)}>
                <i className={`ph ${copied ? "ph-check" : "ph-link"}`} /> {copied ? "Link copied" : "Copy invite link"}
              </button>
            </div>
          )}
          <p className="sub" style={{ margin: "0 0 4px", fontSize: 12.5 }}>
            Or give them the code directly: <code style={{ fontWeight: 700, letterSpacing: "0.04em" }}>{invite.code}</code>
          </p>
          <p className="sub" style={{ margin: "0 0 12px", fontSize: 12.5 }}>
            Expires {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
          <button className="btn" disabled={generating} onClick={generate}>
            {generating ? "Generating…" : expired ? "Generate new code" : "Regenerate code"}
          </button>
          {error && (
            <p className="note" style={{ marginTop: 10 }}>
              <i className="ph ph-warning-circle ic-primary" /> {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
