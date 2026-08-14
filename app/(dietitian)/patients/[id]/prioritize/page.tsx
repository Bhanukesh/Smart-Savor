import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import PatientLocalNav from "@/components/PatientLocalNav";
import ConfirmFocusSet from "@/components/ConfirmFocusSet";
import FocusSetBoard from "@/components/FocusSetBoard";
import { getPatient, getFocusSet, getCycleConfirmedAt, computeDashboard } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatientPrioritizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();
  const focus = await getFocusSet(id);
  const confirmedAt = await getCycleConfirmedAt(id);
  const gauges = await computeDashboard(id);

  return (
    <>
      <Topbar
        context="Dietitian console"
        showAccountMenu
        who={
          <>
            <i className="ph ph-stethoscope ic-primary" /> {patient.dietitianName}
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <PatientLocalNav patientId={patient.id} patientName={patient.name} />

        <p className="eyebrow">{patient.name} · Stage D1.5</p>
        <h1>
          This week&apos;s <em>focus set</em>
        </h1>
        <p className="sub">
          Ranked from the latest panel and 14-day intake log. Confirm to publish the set downstream
          to swap-menu generation (D2), or override the ranking.
        </p>

        <div className="card">
          <h2>
            <i className="ph ph-list-numbers ic-primary" /> Ranked focus set
          </h2>
          <FocusSetBoard patientId={patient.id} initialFocus={focus} gauges={gauges} />
          <ConfirmFocusSet patientId={patient.id} initialConfirmedAt={confirmedAt} />
        </div>

        <p className="note">
          <strong>
            <i className="ph ph-info ic-primary" /> Note:
          </strong>{" "}
          Lipids and glycemic control markers from the panel are handled as screening
          constraints at the ratify stage — they shape what&apos;s excluded, not what&apos;s ranked.
        </p>
      </main>
    </>
  );
}
