import Link from "next/link";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import AddPatientForm from "@/components/AddPatientForm";
import { listPatients, getRosterKpis } from "@/lib/data";
import type { RosterStatus } from "@/lib/data";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<RosterStatus, string> = {
  needs_review: "Needs review",
  awaiting_review: "Awaiting your review",
  patient_message: "Patient message",
  on_track: "On track",
};

const STATUS_CHIP: Record<RosterStatus, string> = {
  needs_review: "red",
  awaiting_review: "amber",
  patient_message: "blue",
  on_track: "green",
};

function statusLabel(status: RosterStatus, unreadMessageCount: number): string {
  if (status === "patient_message") {
    return `${unreadMessageCount} new message${unreadMessageCount === 1 ? "" : "s"}`;
  }
  return STATUS_LABEL[status];
}

export default async function CaseloadPage() {
  const [patients, kpis] = await Promise.all([listPatients(), getRosterKpis()]);

  return (
    <>
      <Topbar
        context="Dietitian console"
        showAccountMenu
        who={
          <>
            <i className="ph ph-stethoscope ic-primary" /> {patients[0]?.dietitianName ?? "Dietitian"}
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Dietitian · Caseload</p>
        <h1>
          Your <em>patients</em>
        </h1>
        <p className="sub">
          Everyone on your caseload, one place. Click a patient to see their full profile — focus
          set, swap menu, and messages all live there.
        </p>

        <AddPatientForm />

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            {[
              { label: "Active patients", value: kpis.totalPatients },
              { label: "Needs your review", value: kpis.needsReviewCount },
              { label: "Avg. adherence", value: `${kpis.avgAdherencePct}%` },
              { label: "Unread messages", value: kpis.unreadMessageTotal },
            ].map((stat) => (
              <div key={stat.label} style={{ minWidth: 110 }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{stat.value}</div>
                <div className="sub" style={{ margin: 0, fontSize: 12.5 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>
            <i className="ph ph-users-three ic-primary" /> {patients.length} patient{patients.length === 1 ? "" : "s"}
          </h2>
          {patients.length === 0 ? (
            <p className="sub" style={{ margin: "8px 0" }}>No patients enrolled yet.</p>
          ) : (
            patients.map((p) => (
              <Link className="row" key={p.id} href={`/patients/${p.id}`} style={{ display: "flex" }}>
                <div className="grow">
                  <div className="title">
                    {p.name}, {p.age}
                    <span className={`chip ${STATUS_CHIP[p.status]}`}>
                      {statusLabel(p.status, p.unreadMessageCount)}
                    </span>
                  </div>
                  <div className="meta">
                    {p.conditions.length > 0 ? p.conditions.join(" · ") : "No conditions on file"} ·
                    Dietitian: {p.dietitianName || "Unassigned"}
                  </div>
                </div>
                <i className="ph ph-caret-right" style={{ color: "var(--muted-foreground)" }} />
              </Link>
            ))
          )}
        </div>
      </main>
    </>
  );
}
