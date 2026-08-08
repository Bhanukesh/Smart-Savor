"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ReceiptSummary, ReceiptLineItemEntry } from "@/lib/types";

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  parsed: { cls: "green", label: "Read" },
  pending: { cls: "ghost", label: "Reading…" },
  failed: { cls: "red", label: "Couldn't read" },
  needs_review: { cls: "amber", label: "Needs review" },
};

export default function ReceiptUpload({
  patientId,
  initialReceipts,
}: {
  patientId: string;
  initialReceipts: ReceiptSummary[];
}) {
  const [receipts, setReceipts] = useState(initialReceipts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/patients/${patientId}/receipts`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mediaType: file.type || "image/jpeg" }),
        });
        if (!res.ok) throw new Error("upload failed");
        const created: { id: string; uploadDate: string; retailer?: string; parseStatus: string; lineItems: ReceiptLineItemEntry[] } = await res.json();
        setReceipts((prev) => [
          {
            id: created.id, uploadDate: created.uploadDate, retailer: created.retailer,
            parseStatus: created.parseStatus as ReceiptSummary["parseStatus"],
            itemCount: created.lineItems.length,
            pendingReviewCount: created.lineItems.filter((li) => li.confirmed === null).length,
          },
          ...prev,
        ]);
      } catch {
        setError("Couldn't upload that receipt — try again.");
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="card pad-lg">
      <h2>
        <i className="ph ph-receipt ic-primary" /> Grocery receipts
      </h2>
      <p className="sub" style={{ margin: "0 0 16px" }}>
        Last few months, if you have them — a photo or PDF both work.
      </p>

      <button className="btn primary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
        <i className="ph-bold ph-upload-simple" /> {busy ? "Reading receipt…" : "Upload a receipt"}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" capture="environment" onChange={onFilePicked} style={{ display: "none" }} />

      {error && (
        <p className="note" style={{ marginTop: 14 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        {receipts.length === 0 ? (
          <p className="sub" style={{ margin: 0 }}>No receipts uploaded yet.</p>
        ) : (
          receipts.map((r) => {
            const status = STATUS_CHIP[r.parseStatus] ?? STATUS_CHIP.pending;
            const clickable = r.parseStatus === "parsed" || r.parseStatus === "needs_review";
            const row = (
              <div className="row">
                <div className="grow">
                  <div className="title">
                    {r.retailer ?? "Receipt"} <span className={`chip ${status.cls}`}>{status.label}</span>
                    {r.pendingReviewCount > 0 && <span className="chip amber">{r.pendingReviewCount} to review</span>}
                  </div>
                  <div className="meta">
                    {new Date(r.uploadDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {r.itemCount} item{r.itemCount === 1 ? "" : "s"}
                  </div>
                </div>
                {clickable && <i className="ph ph-caret-right" style={{ color: "var(--muted-foreground)" }} />}
              </div>
            );
            return clickable ? (
              <Link key={r.id} href={`/me/receipts/${r.id}`} style={{ display: "block" }}>
                {row}
              </Link>
            ) : (
              <div key={r.id}>{row}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
