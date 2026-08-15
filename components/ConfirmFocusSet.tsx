"use client";

import { useState } from "react";
import Link from "next/link";

/** D1.5 confirm gesture — persists Cycle.focusSetConfirmedAt, then reveals the "published" note. */
export default function ConfirmFocusSet({
  patientId,
  initialConfirmedAt,
}: {
  patientId: string;
  initialConfirmedAt: string | null;
}) {
  const [published, setPublished] = useState(!!initialConfirmedAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/focus-set/confirm`, { method: "POST" });
      if (!res.ok) throw new Error();
      setPublished(true);
    } catch {
      setError("Couldn't confirm the focus set — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button
          className="btn primary"
          disabled={published || saving}
          onClick={confirm}
        >
          Confirm focus set <i className="ph-bold ph-arrow-right" />
        </button>
      </div>
      {published && (
        <p className="note safe">
          <strong>
            <i className="ph ph-check-circle" /> Published:
          </strong>{" "}
          Focus set confirmed and sent to swap-menu generation.{" "}
          <Link href={`/patients/${patientId}/ratify`} style={{ textDecoration: "underline" }}>
            Continue to Ratify (D2/D3) →
          </Link>
        </p>
      )}
      {error && (
        <p className="note" style={{ marginTop: 10 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}
    </>
  );
}
