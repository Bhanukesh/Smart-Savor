"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteCodeForm({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/invite/signup?code=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={submit} className="card pad-lg">
      <h2>
        <i className="ph ph-hash ic-primary" /> Enter your invite code
      </h2>
      <p className="sub" style={{ margin: "0 0 16px" }}>
        Your dietitian gave you a one-time code after your visit.
      </p>
      <div className="field-row">
        <label className="field-label" htmlFor="invite-code">Invite code</label>
        <input
          id="invite-code" className="field" placeholder="e.g. SAM-7XQK-2026"
          value={code} onChange={(e) => setCode(e.target.value)} autoFocus
        />
      </div>
      <button className="btn primary" type="submit" disabled={!code.trim()} style={{ width: "100%" }}>
        Continue <i className="ph-bold ph-arrow-right" />
      </button>
      <p className="note" style={{ marginTop: 16 }}>
        <i className="ph ph-shield-check ic-primary" /> Private &amp; dietitian-backed — nothing reaches
        you without your dietitian&apos;s sign-off.
      </p>
    </form>
  );
}
