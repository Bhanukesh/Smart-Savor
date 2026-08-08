"use client";

import { useState } from "react";
import type { ReceiptDetail, ReceiptLineItemEntry } from "@/lib/types";

export default function ReceiptReview({ patientId, receipt }: { patientId: string; receipt: ReceiptDetail }) {
  const [items, setItems] = useState(receipt.lineItems);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setConfirmed(item: ReceiptLineItemEntry, confirmed: boolean) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/patients/${patientId}/receipts/${receipt.id}/line-items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmed }),
      });
      if (!res.ok) throw new Error("confirm failed");
      const updated: ReceiptLineItemEntry = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      // leave state as-is — buttons stay clickable to retry
    } finally {
      setBusyId(null);
    }
  }

  if (receipt.parseStatus === "failed") {
    return (
      <div className="card pad-lg">
        <h2>
          <i className="ph ph-warning-circle ic-primary" /> Couldn&apos;t read this one
        </h2>
        <p className="sub" style={{ margin: 0 }}>
          Try retaking the photo in better light, or skip it — your other receipts are unaffected.
        </p>
      </div>
    );
  }

  return (
    <div className="card pad-lg">
      <h2>
        <i className="ph ph-receipt ic-primary" /> {receipt.retailer ?? "Receipt"} items
      </h2>
      {items.map((item) => (
        <div className="row" key={item.id}>
          <div className="grow">
            <div className="title">
              {item.matchedFood ?? item.rawText}
              {item.matchFlag === "needs_review" && <span className="chip amber">Needs review</span>}
            </div>
            <div className="meta">
              {item.rawText}
              {item.priceUsd !== undefined && ` · $${item.priceUsd.toFixed(2)}`}
            </div>
          </div>
          <div className="btn-row">
            <button
              className="btn sm"
              style={item.confirmed === true ? { borderColor: "var(--success)", color: "var(--success)" } : undefined}
              onClick={() => setConfirmed(item, true)}
              disabled={busyId === item.id}
            >
              <i className="ph-bold ph-check" /> This is mine
            </button>
            <button
              className="btn sm"
              style={item.confirmed === false ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
              onClick={() => setConfirmed(item, false)}
              disabled={busyId === item.id}
            >
              <i className="ph-bold ph-x" /> Not mine
            </button>
          </div>
        </div>
      ))}
      <p className="note" style={{ marginTop: 16 }}>
        <i className="ph ph-eye ic-primary" /> Only items you confirm feed your habit model —
        exclude anything a family member bought that you don&apos;t eat.
      </p>
    </div>
  );
}
