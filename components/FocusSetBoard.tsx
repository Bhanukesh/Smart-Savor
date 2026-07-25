"use client";

import { useState } from "react";
import type { FocusItem } from "@/lib/types";

export default function FocusSetBoard({
  patientId,
  initialFocus,
}: {
  patientId: string;
  initialFocus: FocusItem[];
}) {
  const [focus, setFocus] = useState(initialFocus);
  const [overriding, setOverriding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Only active (non-excluded) items are ranked/draggable; excluded ones are pinned at the end.
  const active = focus.filter((f) => !f.excluded);
  const excluded = focus.filter((f) => f.excluded);

  function reorderLocally(from: number, to: number) {
    if (from === to) return;
    setFocus((prev) => {
      const prevActive = prev.filter((f) => !f.excluded);
      const prevExcluded = prev.filter((f) => f.excluded);
      const next = [...prevActive];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return [...next.map((f, i) => ({ ...f, rank: i + 1 })), ...prevExcluded];
    });
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/focus-set/reorder`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nutrientGapIds: active.map((f) => f.gap.id) }),
      });
      if (res.ok) {
        setFocus(await res.json());
        setOverriding(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function cancelOverride() {
    setFocus(initialFocus);
    setOverriding(false);
  }

  function row(f: FocusItem, i: number) {
    return (
      <div
        className="row"
        key={f.gap.id}
        draggable={overriding && !f.excluded}
        onDragStart={() => setDragIndex(i)}
        onDragOver={(e) => {
          if (overriding) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragIndex !== null) reorderLocally(dragIndex, i);
          setDragIndex(null);
        }}
        style={overriding && !f.excluded ? { cursor: "grab" } : undefined}
      >
        <div className={`rank${f.excluded ? " warn" : ""}`}>
          {overriding && !f.excluded ? <i className="ph-bold ph-dots-six-vertical" /> : f.excluded ? "!" : f.rank}
        </div>
        <div className="grow">
          <div className="title">
            {f.gap.label}
            {f.rank === 1 && !f.excluded && <span className="chip blue">Priority</span>}
            {f.pairWith && f.rank !== 1 && !f.excluded && <span className="chip blue">Pairs with #1</span>}
            {f.excluded && <span className="chip amber">Flagged — not food-first</span>}
          </div>
          <div className="meta">
            Target {f.gap.targetValue} {f.gap.unit}/day · current {f.gap.currentValue} {f.gap.unit} ·
            gap {f.gap.targetValue - f.gap.currentValue} {f.gap.unit}. Reason: {f.why}
            {f.pairWith && (
              <>
                <br />
                Pairs: {f.pairWith}
                {f.conflictsWith && <> · Conflicts: {f.conflictsWith}</>}
              </>
            )}
            {f.excludeReason && <> {f.excludeReason}</>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {active.map(row)}
      {excluded.map((f) => row(f, -1))}

      <div className="btn-row" style={{ marginTop: 12 }}>
        {overriding ? (
          <>
            <p className="sub" style={{ margin: 0, flexBasis: "100%" }}>
              <i className="ph ph-dots-six-vertical" /> Drag rows to reorder, then save.
            </p>
            <button className="btn" disabled={saving} onClick={cancelOverride}>Cancel</button>
            <button className="btn primary" disabled={saving} onClick={saveOrder}>
              {saving ? "Saving…" : "Save order"}
            </button>
          </>
        ) : (
          <button className="btn" onClick={() => setOverriding(true)}>
            <i className="ph ph-arrows-down-up" /> Override ranking
          </button>
        )}
      </div>
    </>
  );
}
