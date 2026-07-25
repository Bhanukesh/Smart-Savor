"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApprovedList, ApprovedListItem } from "@/lib/types";

const CHIP: Record<string, string> = { approved: "green", flagged: "amber", excluded: "red" };
const CHIP_LABEL: Record<string, string> = { approved: "Approved", flagged: "Flagged", excluded: "Excluded" };
const RANK: Record<string, { cls: string; icon?: string; txt?: string }> = {
  approved: { cls: "ok", icon: "ph-check" },
  flagged: { cls: "warn", txt: "!" },
  excluded: { cls: "bad", icon: "ph-x" },
};

export default function RatifyBoard({
  patientId,
  patientFirstName,
  nutrient,
  nutrientLabel,
  initialItems,
}: {
  patientId: string;
  patientFirstName: string;
  nutrient: string;
  nutrientLabel: string;
  initialItems: ApprovedListItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");

  async function act(itemId: string, action: "approve" | "restore" | "remove" | "edit", note?: string) {
    setBusyId(itemId);
    try {
      const res = await fetch(`/api/patients/${patientId}/approved-lists/${nutrient}/items/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) return;
      const updated: ApprovedListItem = await res.json();
      if (action === "remove") {
        setItems((prev) => prev.filter((it) => it.id !== itemId));
      } else {
        setItems((prev) => prev.map((it) => (it.id === itemId ? updated : it)));
      }
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(item: ApprovedListItem) {
    setEditingId(item.id);
    setDraftNote(item.note);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftNote("");
  }

  async function saveEdit(itemId: string) {
    await act(itemId, "edit", draftNote);
    setEditingId(null);
    setDraftNote("");
  }

  async function addCandidate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/approved-lists/${nutrient}/generate`, {
        method: "POST",
      });
      if (!res.ok) return;
      const list: ApprovedList = await res.json();
      setItems(list.items);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="card">
      <h2>
        <i className="ph ph-check-square ic-primary" /> {nutrientLabel} swap menu — {items.length} candidates
      </h2>
      {items.map((it) => {
        const r = RANK[it.status];
        const busy = busyId === it.id;
        const editing = editingId === it.id;
        return (
          <div className="row" key={it.id}>
            <div className={`rank ${r.cls}`}>{r.icon ? <i className={`ph-bold ${r.icon}`} /> : r.txt}</div>
            <div className="grow">
              <div className="title" style={it.status === "excluded" ? { color: "var(--danger)" } : undefined}>
                {it.foodName} {it.prep && `(${it.prep})`}
                <span className={`chip ${CHIP[it.status]}`}>
                  {CHIP_LABEL[it.status]}{it.edited ? " · edited" : ""}
                </span>
              </div>
              {editing ? (
                <textarea
                  className="field"
                  rows={2}
                  autoFocus
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              ) : (
                <div className="meta">
                  ~{it.amountPerServing} {it.unit} {nutrient === "iron" ? "iron" : nutrientLabel.toLowerCase()}/
                  {it.servingDescription.replace(/^1\s+/, "")} · {it.note}
                </div>
              )}
            </div>
            <div className="btn-row">
              {editing ? (
                <>
                  <button className="btn sm" disabled={busy} onClick={cancelEdit}>Cancel</button>
                  <button className="btn sm primary" disabled={busy} onClick={() => saveEdit(it.id)}>Save</button>
                </>
              ) : it.status === "excluded" ? (
                <button className="btn sm" disabled={busy} onClick={() => act(it.id, "restore")}>Restore</button>
              ) : it.status === "flagged" ? (
                <>
                  <button className="btn sm primary" disabled={busy} onClick={() => act(it.id, "approve")}>Approve</button>
                  <button className="btn sm" disabled={busy} onClick={() => startEdit(it)}>Edit</button>
                </>
              ) : (
                <>
                  <button className="btn sm" disabled={busy} onClick={() => startEdit(it)}>Edit</button>
                  <button className="btn sm" disabled={busy} onClick={() => act(it.id, "remove")}>Remove</button>
                </>
              )}
            </div>
          </div>
        );
      })}

      <div className="btn-row" style={{ marginTop: 16 }}>
        <Link className="btn primary" href="/me/swap">
          Publish ratified menu to {patientFirstName} <i className="ph-bold ph-arrow-right" />
        </Link>
        <button className="btn" disabled={generating} onClick={addCandidate}>
          {generating ? "Sourcing…" : "Add candidate"}
        </button>
      </div>
    </div>
  );
}
