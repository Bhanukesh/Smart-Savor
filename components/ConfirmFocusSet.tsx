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

  async function confirm() {
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/focus-set/confirm`, { method: "POST" });
      if (res.ok) setPublished(true);
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
          <Link href={`/rx/ratify?patient=${patientId}`} style={{ textDecoration: "underline" }}>
            Continue to Ratify (D2/D3) →
          </Link>
        </p>
      )}
    </>
  );
}
