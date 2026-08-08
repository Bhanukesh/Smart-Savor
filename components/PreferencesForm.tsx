"use client";

import { useState } from "react";
import type { Patient } from "@/lib/types";

export default function PreferencesForm({ patientId, patient }: { patientId: string; patient: Patient }) {
  const [restrictions, setRestrictions] = useState(patient.restrictions.join(", "));
  const [dislikes, setDislikes] = useState(patient.dislikes.join(", "));
  const [budget, setBudget] = useState(patient.weeklyBudgetUsd?.toString() ?? "");
  const [nudgeEnabled, setNudgeEnabled] = useState(patient.weeklyNudgeEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/preferences`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          restrictions: restrictions.split(",").map((s) => s.trim()).filter(Boolean),
          dislikes: dislikes.split(",").map((s) => s.trim()).filter(Boolean),
          ...(budget.trim() ? { weeklyBudgetUsd: Number(budget) } : {}),
          weeklyNudgeEnabled: nudgeEnabled,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card pad-lg">
      <h2>
        <i className="ph ph-identification-card ic-primary" /> Your plan
      </h2>

      <div className="field-row">
        <label className="field-label" htmlFor="pref-dietitian">Your dietitian</label>
        <div id="pref-dietitian" style={{ fontSize: 14.5, fontWeight: 600 }}>{patient.dietitianName}</div>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="pref-restrictions">Dietary restrictions</label>
        <input
          id="pref-restrictions" className="field" placeholder="e.g. vegetarian"
          value={restrictions} onChange={(e) => setRestrictions(e.target.value)}
        />
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="pref-dislikes">Dislikes</label>
        <input
          id="pref-dislikes" className="field" placeholder="e.g. mushrooms"
          value={dislikes} onChange={(e) => setDislikes(e.target.value)}
        />
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="pref-budget">Weekly grocery budget (USD)</label>
        <input
          id="pref-budget" className="field" type="number" min={0} step={1} placeholder="Optional"
          value={budget} onChange={(e) => setBudget(e.target.value)}
        />
      </div>

      <div className="field-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="field-label" style={{ margin: 0 }}>Weekly nudge notifications</div>
          <div style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>One gentle nudge a week, never daily.</div>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={nudgeEnabled} onChange={(e) => setNudgeEnabled(e.target.checked)} />
          <span className="slider" />
        </label>
      </div>

      <div className="btn-row" style={{ marginTop: 18 }}>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span style={{ color: "var(--success)", fontSize: 13, fontWeight: 600 }}>
            <i className="ph-bold ph-check" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
