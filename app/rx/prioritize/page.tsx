import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import ConfirmFocusSet from "@/components/ConfirmFocusSet";
import FocusSetBoard from "@/components/FocusSetBoard";
import { resolvePatient, getFocusSet, getCycleConfirmedAt } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PrioritizePage({
  searchParams,
}: {
  searchParams: { patient?: string };
}) {
  const patient = await resolvePatient(searchParams.patient);
  if (!patient) notFound();
  const focus = await getFocusSet(patient.id);
  const confirmedAt = await getCycleConfirmedAt(patient.id);

  return (
    <>
      <Topbar
        context="Dietitian console"
        who={
          <>
            <i className="ph ph-stethoscope ic-primary" /> Signed in: <b>{patient.dietitianName}</b> ·
            Patient: <b>{patient.name}, {patient.age}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Dietitian · Stage D1.5</p>
        <h1>
          This week&apos;s <em>focus set</em>
        </h1>
        <p className="sub">
          Ranked from the latest panel and 14-day intake log. Confirm to publish the set downstream
          to swap-menu generation (D2), or override the ranking.
        </p>

        <div className="card">
          <h2>
            <i className="ph ph-identification-badge ic-primary" /> Patient snapshot — {patient.name}, {patient.age}
          </h2>
          <div className="btn-row" style={{ marginBottom: 10 }}>
            {patient.conditions.map((c) => (
              <span key={c} className="chip ghost">{c}</span>
            ))}
            <span className="chip ghost">BMI {patient.bmi}</span>
            <span className="chip ghost">BP {patient.bpSystolic}/{patient.bpDiastolic}</span>
          </div>
          <p className="sub" style={{ margin: 0 }}>
            Labs (this cycle):{" "}
            {patient.labs.map((l, k) => (
              <span key={l.name}>
                <b>{l.name} {l.value}</b>{k < patient.labs.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>

        <div className="card">
          <h2>
            <i className="ph ph-list-numbers ic-primary" /> Ranked focus set
          </h2>
          <FocusSetBoard patientId={patient.id} initialFocus={focus} />
          <ConfirmFocusSet patientId={patient.id} initialConfirmedAt={confirmedAt} />
        </div>

        <p className="note">
          <strong>
            <i className="ph ph-info ic-primary" /> Note:
          </strong>{" "}
          Lipids (LDL 151, TG 210) and glycemic control (HbA1c 7.2%) are handled as screening
          constraints at the ratify stage — they shape what&apos;s excluded, not what&apos;s ranked.
        </p>
      </main>
    </>
  );
}
