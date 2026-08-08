"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApprovedList, ApprovedListItem } from "@/lib/types";

type SearchResult = {
  id: string;
  productName: string;
  brand?: string;
  department?: string;
  priceUsd?: number;
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftUnit, setDraftUnit] = useState("");
  const [draftServing, setDraftServing] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/grocery-items/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data: { results: SearchResult[] } = await res.json();
          setResults(data.results);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function addFromSearch(item: SearchResult) {
    setAddingId(item.id);
    try {
      const res = await fetch(`/api/patients/${patientId}/approved-lists/${nutrient}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groceryItemId: item.id }),
      });
      if (!res.ok) return;
      const list: ApprovedList = await res.json();
      setItems(list.items);
      setQuery("");
      setResults([]);
    } finally {
      setAddingId(null);
    }
  }

  async function act(
    itemId: string,
    action: "approve" | "restore" | "remove" | "edit",
    edits?: { note?: string; amountPerServing?: number; unit?: string; servingDescription?: string },
  ) {
    setBusyId(itemId);
    try {
      const res = await fetch(`/api/patients/${patientId}/approved-lists/${nutrient}/items/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...edits }),
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
    setDraftAmount(String(item.amountPerServing));
    setDraftUnit(item.unit);
    setDraftServing(item.servingDescription);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftNote("");
    setDraftAmount("");
    setDraftUnit("");
    setDraftServing("");
  }

  async function saveEdit(itemId: string) {
    const amount = Number(draftAmount);
    await act(itemId, "edit", {
      note: draftNote,
      ...(Number.isFinite(amount) && amount > 0 && { amountPerServing: amount }),
      ...(draftUnit.trim() && { unit: draftUnit.trim() }),
      ...(draftServing.trim() && { servingDescription: draftServing.trim() }),
    });
    cancelEdit();
  }

  return (
    <div className="card">
      <h2>
        <i className="ph ph-check-square ic-primary" /> {nutrientLabel} swap menu — {items.length} candidates
      </h2>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <input
          type="text"
          className="field"
          placeholder="Search all foods to add to this menu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <div
            className="card"
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
              maxHeight: 280, overflowY: "auto", padding: 8,
            }}
          >
            {searching ? (
              <p className="sub" style={{ margin: "6px 8px" }}>Searching…</p>
            ) : results.length === 0 ? (
              <p className="sub" style={{ margin: "6px 8px" }}>No foods match &quot;{query}&quot;.</p>
            ) : (
              results.map((r) => (
                <div
                  key={r.id}
                  className="btn-row"
                  style={{ justifyContent: "space-between", padding: "6px 8px" }}
                >
                  <span style={{ fontSize: 13.5 }}>
                    {r.productName}
                    {r.brand && <span style={{ color: "var(--muted-foreground)" }}> · {r.brand}</span>}
                    {r.priceUsd !== undefined && (
                      <span style={{ color: "var(--muted-foreground)" }}> · ${r.priceUsd.toFixed(2)}</span>
                    )}
                  </span>
                  <button
                    className="btn sm primary"
                    disabled={addingId === r.id}
                    onClick={() => addFromSearch(r)}
                  >
                    {addingId === r.id ? "Adding…" : "Add"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="field"
                      autoFocus
                      value={draftAmount}
                      onChange={(e) => setDraftAmount(e.target.value)}
                      style={{ width: 90 }}
                      aria-label="Amount per serving"
                    />
                    <input
                      className="field"
                      value={draftUnit}
                      onChange={(e) => setDraftUnit(e.target.value)}
                      style={{ width: 90 }}
                      aria-label="Unit"
                      placeholder="mg, g…"
                    />
                    <input
                      className="field"
                      value={draftServing}
                      onChange={(e) => setDraftServing(e.target.value)}
                      style={{ flex: 1 }}
                      aria-label="Serving description"
                      placeholder="1 cup, cooked…"
                    />
                  </div>
                  <textarea
                    className="field"
                    rows={2}
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Note for the patient…"
                  />
                </div>
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
      </div>
    </div>
  );
}
