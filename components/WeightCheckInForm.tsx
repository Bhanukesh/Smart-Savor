"use client";

import { useState } from "react";
import type { WeightCheckInEntry } from "@/lib/types";

export default function WeightCheckInForm({
  patientId,
  initialCheckIns,
}: {
  patientId: string;
  initialCheckIns: WeightCheckInEntry[];
}) {
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = checkIns[checkIns.length - 1];
  const previous = checkIns[checkIns.length - 2];
  const suddenChange = latest && previous && Math.abs(latest.weightLb - previous.weightLb) >= 3;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const weightLb = Number(weight);
    if (!weightLb || weightLb <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/weight-check-ins`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weightLb }),
      });
      if (!res.ok) throw new Error();
      const created: WeightCheckInEntry = await res.json();
      setCheckIns((prev) => [...prev, created]);
      setWeight("");
    } catch {
      setError("Couldn't save that — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card pad-lg" id="weight">
      <h2>
        <i className="ph ph-chart-line-up ic-primary" /> Weight check-ins
      </h2>
      <p className="sub" style={{ margin: "0 0 16px" }}>
        Optional, and never a weight-loss target — this is clinical monitoring for a chronic
        condition. A sudden jump can flag fluid retention, not diet.
      </p>

      <form onSubmit={submit} className="btn-row">
        <input
          className="field" type="number" min={1} max={999} step={0.1} style={{ maxWidth: 140 }}
          placeholder="lb" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={saving}
        />
        <button className="btn primary" type="submit" disabled={saving || !weight}>
          {saving ? "Saving…" : "Log weight"}
        </button>
      </form>
      {error && (
        <p className="note" style={{ marginTop: 14 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}

      {checkIns.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontWeight: 600, fontSize: "13.5px", marginBottom: 4, color: "var(--muted-foreground)" }}>
            LAST {checkIns.length} {checkIns.length === 1 ? "ENTRY" : "ENTRIES"}
          </div>
          {[...checkIns].reverse().map((c) => (
            <div className="row" key={c.id}>
              <div className="grow">
                <div className="title">{c.weightLb} lb</div>
                <div className="meta">{new Date(c.checkedInAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suddenChange && (
        <p className="note" style={{ marginTop: 16 }}>
          <i className="ph ph-warning-circle ic-primary" /> That&apos;s a {Math.abs(latest.weightLb - previous.weightLb).toFixed(1)} lb
          change since your last entry — worth mentioning to your dietitian, often fluid, not food.
        </p>
      )}
    </div>
  );
}
