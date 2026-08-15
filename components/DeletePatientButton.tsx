"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onDelete() {
    if (!window.confirm(`Delete ${patientName}? This removes their whole record — labs, receipts, focus set, messages, everything. There's no undo.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't delete this patient — try again.");
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button
        className="btn sm"
        style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
        disabled={deleting}
        onClick={onDelete}
      >
        <i className="ph-bold ph-trash" /> {deleting ? "Deleting…" : "Delete patient"}
      </button>
      {error && (
        <span style={{ color: "var(--danger)", fontSize: 12.5 }}>{error}</span>
      )}
    </div>
  );
}
