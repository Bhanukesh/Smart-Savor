"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function onDelete() {
    if (!window.confirm(`Delete ${patientName}? This removes their whole record — labs, receipts, focus set, messages, everything. There's no undo.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setDeleting(false);
      }
    } catch {
      setDeleting(false);
    }
  }

  return (
    <button
      className="btn sm"
      style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
      disabled={deleting}
      onClick={onDelete}
    >
      <i className="ph-bold ph-trash" /> {deleting ? "Deleting…" : "Delete patient"}
    </button>
  );
}
