"use client";

import { useState } from "react";
import type { LabReportDetail, LabReportFindingEntry } from "@/lib/types";

export default function LabReportReview({ patientId, report }: { patientId: string; report: LabReportDetail }) {
  const [findings, setFindings] = useState(report.findings);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setConfirmed(finding: LabReportFindingEntry, confirmed: boolean) {
    setBusyId(finding.id);
    try {
      const res = await fetch(`/api/patients/${patientId}/lab-reports/${report.id}/findings/${finding.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmed }),
      });
      if (!res.ok) throw new Error("confirm failed");
      const updated: LabReportFindingEntry = await res.json();
      setFindings((prev) => prev.map((f) => (f.id === finding.id ? updated : f)));
    } catch {
      // leave state as-is — buttons stay clickable to retry
    } finally {
      setBusyId(null);
    }
  }

  if (report.parseStatus === "failed") {
    return (
      <div className="card pad-lg">
        <h2>
          <i className="ph ph-warning-circle ic-primary" /> Couldn&apos;t read this one
        </h2>
        <p className="sub" style={{ margin: 0 }}>
          Try retaking the photo in better light, or skip it — your other reports are unaffected.
        </p>
      </div>
    );
  }

  return (
    <div className="card pad-lg">
      <h2>
        <i className="ph ph-flask ic-primary" /> Lab report results
      </h2>
      {findings.length === 0 ? (
        <p className="sub" style={{ margin: 0 }}>
          Nothing on this report matched a nutrient we track.
        </p>
      ) : (
        findings.map((f) => (
          <div className="row" key={f.id}>
            <div className="grow">
              <div className="title">
                {f.label}
                {f.confirmed === true && <span className="chip green">Confirmed</span>}
                {f.confirmed === false && <span className="chip red">Rejected</span>}
              </div>
              <div className="meta">{f.currentValue} {f.unit}</div>
            </div>
            <div className="btn-row">
              <button
                className="btn sm"
                style={f.confirmed === true ? { borderColor: "var(--success)", color: "var(--success)" } : undefined}
                onClick={() => setConfirmed(f, true)}
                disabled={busyId === f.id}
              >
                <i className="ph-bold ph-check" /> Confirm
              </button>
              <button
                className="btn sm"
                style={f.confirmed === false ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
                onClick={() => setConfirmed(f, false)}
                disabled={busyId === f.id}
              >
                <i className="ph-bold ph-x" /> Reject
              </button>
            </div>
          </div>
        ))
      )}
      <p className="note" style={{ marginTop: 16 }}>
        <i className="ph ph-eye ic-primary" /> Confirming a result adds it to your dietitian&apos;s
        focus set options — rejecting it (e.g. a misread value) leaves your plan unchanged.
      </p>
    </div>
  );
}
