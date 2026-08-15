"use client";

import { useEffect, useState } from "react";
import DayTrackRow from "@/components/DayTrackRow";
import type { DashboardGauge, FocusItem, NutrientGap, NutrientKey, Severity } from "@/lib/types";

type CreatableNutrient = { nutrient: NutrientKey; label: string; unit: string };

export default function FocusSetBoard({
  patientId,
  initialFocus,
  gauges,
}: {
  patientId: string;
  initialFocus: FocusItem[];
  /** last-7-days on-track history per gap, matched by gapId — only present once a gap has a
   * ratified approved list (same condition computeDashboard uses), so not every row gets one. */
  gauges: DashboardGauge[];
}) {
  const [focus, setFocus] = useState(initialFocus);
  const [overriding, setOverriding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingGapId, setEditingGapId] = useState<string | null>(null);
  const [draftWhy, setDraftWhy] = useState("");
  const [draftCurrent, setDraftCurrent] = useState("");
  const [draftTarget, setDraftTarget] = useState("");
  const [draftSeverity, setDraftSeverity] = useState<Severity>("moderate");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingGapId, setDeletingGapId] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [available, setAvailable] = useState<NutrientGap[] | null>(null);
  const [availableError, setAvailableError] = useState(false);
  const [pickedGapId, setPickedGapId] = useState("");
  const [why, setWhy] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // "Track a new nutrient gap" — for the case getAvailableNutrientGaps can't help with:
  // the patient has nothing on file for this nutrient at all yet, so there's nothing to pull
  // from (e.g. a patient with only 1-2 gaps seeded shows an empty picker above).
  const [creatable, setCreatable] = useState<CreatableNutrient[] | null>(null);
  const [creatableError, setCreatableError] = useState(false);
  const [newNutrient, setNewNutrient] = useState("");
  const [newCurrent, setNewCurrent] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newSeverity, setNewSeverity] = useState<Severity>("moderate");
  const [newWhy, setNewWhy] = useState("");
  const [submittingNew, setSubmittingNew] = useState(false);

  function loadAvailable() {
    setAvailableError(false);
    fetch(`/api/patients/${patientId}/focus-set/available`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((gaps: NutrientGap[]) => {
        setAvailable(gaps);
        setPickedGapId(gaps[0]?.id ?? "");
      })
      .catch(() => setAvailableError(true));
  }

  function loadCreatable() {
    setCreatableError(false);
    fetch(`/api/patients/${patientId}/focus-set/creatable`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((nutrients: CreatableNutrient[]) => {
        setCreatable(nutrients);
        setNewNutrient(nutrients[0]?.nutrient ?? "");
      })
      .catch(() => setCreatableError(true));
  }

  useEffect(() => {
    if (!adding || available !== null || availableError) return;
    loadAvailable();
  }, [adding, available, availableError, patientId]);

  useEffect(() => {
    if (!adding || creatable !== null || creatableError) return;
    loadCreatable();
  }, [adding, creatable, creatableError, patientId]);

  async function submitAdd() {
    if (!pickedGapId) return;
    setSubmittingAdd(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/focus-set/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nutrientGapId: pickedGapId, why }),
      });
      if (!res.ok) throw new Error();
      setFocus(await res.json());
      setAvailable((prev) => (prev ? prev.filter((g) => g.id !== pickedGapId) : prev));
      setWhy("");
      setAdding(false);
    } catch {
      setError("Couldn't add that gap to the focus set — try again.");
    } finally {
      setSubmittingAdd(false);
    }
  }

  async function submitNewGap() {
    const current = Number(newCurrent);
    const target = Number(newTarget);
    if (!newNutrient || !Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return;
    setSubmittingNew(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/focus-set/new-item`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nutrient: newNutrient, currentValue: current, targetValue: target, severity: newSeverity, why: newWhy }),
      });
      if (!res.ok) throw new Error();
      setFocus(await res.json());
      setCreatable((prev) => (prev ? prev.filter((n) => n.nutrient !== newNutrient) : prev));
      setNewCurrent("");
      setNewTarget("");
      setNewSeverity("moderate");
      setNewWhy("");
      setAdding(false);
    } catch {
      setError("Couldn't track that nutrient gap — try again.");
    } finally {
      setSubmittingNew(false);
    }
  }

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
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/focus-set/reorder`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nutrientGapIds: active.map((f) => f.gap.id) }),
      });
      if (!res.ok) throw new Error();
      setFocus(await res.json());
      setOverriding(false);
    } catch {
      setError("Couldn't save the new order — try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancelOverride() {
    setFocus(initialFocus);
    setOverriding(false);
  }

  function startEdit(f: FocusItem) {
    setEditingGapId(f.gap.id);
    setDraftWhy(f.why);
    setDraftCurrent(String(f.gap.currentValue));
    setDraftTarget(String(f.gap.targetValue));
    setDraftSeverity(f.gap.severity);
  }

  function cancelEdit() {
    setEditingGapId(null);
  }

  async function saveEdit(gapId: string) {
    const current = Number(draftCurrent);
    const target = Number(draftTarget);
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/focus-set/items/${gapId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          why: draftWhy,
          ...(Number.isFinite(current) && { currentValue: current }),
          ...(Number.isFinite(target) && target > 0 && { targetValue: target }),
          severity: draftSeverity,
        }),
      });
      if (!res.ok) throw new Error();
      setFocus(await res.json());
      setEditingGapId(null);
    } catch {
      setError("Couldn't save those changes — try again.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteItem(gapId: string) {
    if (!window.confirm("Remove this item from the focus set? The underlying gap stays on file and can be added back later.")) return;
    setDeletingGapId(gapId);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/focus-set/items/${gapId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFocus(await res.json());
    } catch {
      setError("Couldn't remove that item — try again.");
    } finally {
      setDeletingGapId(null);
    }
  }

  function row(f: FocusItem, i: number) {
    const editing = editingGapId === f.gap.id;
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
          {editing ? (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number" step="0.1" className="field" autoFocus
                  value={draftCurrent} onChange={(e) => setDraftCurrent(e.target.value)}
                  style={{ width: 100 }} aria-label="Current value"
                />
                <input
                  type="number" step="0.1" min="0.1" className="field"
                  value={draftTarget} onChange={(e) => setDraftTarget(e.target.value)}
                  style={{ width: 100 }} aria-label="Target value"
                />
                <select
                  className="field" value={draftSeverity}
                  onChange={(e) => setDraftSeverity(e.target.value as Severity)}
                  aria-label="Severity" style={{ width: 120 }}
                >
                  <option value="severe">Severe</option>
                  <option value="moderate">Moderate</option>
                  <option value="mild">Mild</option>
                </select>
              </div>
              <textarea
                className="field" rows={2} value={draftWhy}
                onChange={(e) => setDraftWhy(e.target.value)}
                placeholder="Why this gap belongs in this cycle's focus set…"
              />
              <div className="btn-row">
                <button className="btn sm" disabled={savingEdit} onClick={cancelEdit}>Cancel</button>
                <button className="btn sm primary" disabled={savingEdit} onClick={() => saveEdit(f.gap.id)}>
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
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
              {!f.excluded && (() => {
                const gauge = gauges.find((g) => g.gapId === f.gap.id);
                return gauge ? <DayTrackRow history={gauge.history} /> : null;
              })()}
              {!overriding && !f.excluded && (
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button className="btn sm" onClick={() => startEdit(f)}>
                    <i className="ph ph-pencil-simple" /> Edit
                  </button>
                  <button className="btn sm" disabled={deletingGapId === f.gap.id} onClick={() => deleteItem(f.gap.id)}>
                    <i className="ph ph-trash" /> {deletingGapId === f.gap.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {active.map(row)}
      {excluded.map((f) => row(f, -1))}

      {error && (
        <p className="note" style={{ marginTop: 12 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}

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
          <>
            <button className="btn" onClick={() => setOverriding(true)}>
              <i className="ph ph-arrows-down-up" /> Override ranking
            </button>
            <button className="btn" onClick={() => setAdding(true)}>
              <i className="ph ph-plus" /> Add focus item
            </button>
          </>
        )}
      </div>

      {adding && (
        <div className="card" style={{ marginTop: 12, background: "var(--background)" }}>
          <h3 style={{ margin: "0 0 10px" }}>
            <i className="ph ph-plus-circle ic-primary" /> Bring back an existing gap
          </h3>
          {availableError ? (
            <div className="sub" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span><i className="ph ph-warning-circle ic-primary" /> Couldn&apos;t load</span>
              <button className="btn sm" onClick={loadAvailable}>Try again</button>
            </div>
          ) : available === null ? (
            <p className="sub" style={{ margin: 0 }}>Loading…</p>
          ) : available.length === 0 ? (
            <p className="sub" style={{ margin: 0 }}>
              Nothing to bring back — every nutrient gap already on file for this patient is in the focus set.
            </p>
          ) : (
            <>
              <div className="field-row">
                <label className="field-label" htmlFor="focus-gap-picker">Nutrient gap</label>
                <select
                  id="focus-gap-picker"
                  className="field"
                  value={pickedGapId}
                  onChange={(e) => setPickedGapId(e.target.value)}
                >
                  {available.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label} — target {g.targetValue}{g.unit}, current {g.currentValue}{g.unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-row" style={{ marginTop: 10 }}>
                <label className="field-label" htmlFor="focus-gap-why">Reason (optional)</label>
                <input
                  id="focus-gap-why"
                  className="field"
                  placeholder="Why this gap belongs in this cycle's focus set…"
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                />
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn primary" disabled={submittingAdd || !pickedGapId} onClick={submitAdd}>
                  {submittingAdd ? "Adding…" : "Add to focus set"}
                </button>
              </div>
            </>
          )}

          <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--border)" }} />

          <h3 style={{ margin: "0 0 10px" }}>
            <i className="ph ph-flask ic-primary" /> Track a new nutrient gap
          </h3>
          {creatableError ? (
            <div className="sub" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span><i className="ph ph-warning-circle ic-primary" /> Couldn&apos;t load</span>
              <button className="btn sm" onClick={loadCreatable}>Try again</button>
            </div>
          ) : creatable === null ? (
            <p className="sub" style={{ margin: 0 }}>Loading…</p>
          ) : creatable.length === 0 ? (
            <p className="sub" style={{ margin: 0 }}>
              Every nutrient this app tracks is already on file for this patient.
            </p>
          ) : (
            <>
              <div className="field-row">
                <label className="field-label" htmlFor="new-nutrient-picker">Nutrient</label>
                <select
                  id="new-nutrient-picker"
                  className="field"
                  value={newNutrient}
                  onChange={(e) => setNewNutrient(e.target.value)}
                >
                  {creatable.map((n) => (
                    <option key={n.nutrient} value={n.nutrient}>{n.label} ({n.unit})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div className="field-row" style={{ flex: 1 }}>
                  <label className="field-label" htmlFor="new-current">Current value</label>
                  <input
                    id="new-current" type="number" step="0.1" className="field"
                    value={newCurrent} onChange={(e) => setNewCurrent(e.target.value)}
                  />
                </div>
                <div className="field-row" style={{ flex: 1 }}>
                  <label className="field-label" htmlFor="new-target">Target value</label>
                  <input
                    id="new-target" type="number" step="0.1" className="field"
                    value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
                  />
                </div>
                <div className="field-row" style={{ flex: 1 }}>
                  <label className="field-label" htmlFor="new-severity">Severity</label>
                  <select
                    id="new-severity" className="field" value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as Severity)}
                  >
                    <option value="severe">Severe</option>
                    <option value="moderate">Moderate</option>
                    <option value="mild">Mild</option>
                  </select>
                </div>
              </div>
              <div className="field-row" style={{ marginTop: 10 }}>
                <label className="field-label" htmlFor="new-why">Reason (optional)</label>
                <input
                  id="new-why"
                  className="field"
                  placeholder="Why this gap belongs in this cycle's focus set…"
                  value={newWhy}
                  onChange={(e) => setNewWhy(e.target.value)}
                />
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button
                  className="btn primary"
                  disabled={submittingNew || !newNutrient || !newCurrent || !newTarget}
                  onClick={submitNewGap}
                >
                  {submittingNew ? "Adding…" : "Track & add to focus set"}
                </button>
              </div>
            </>
          )}

          <div className="btn-row" style={{ marginTop: 16 }}>
            <button
              className="btn"
              disabled={submittingAdd || submittingNew}
              onClick={() => { setAdding(false); setWhy(""); setNewWhy(""); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
