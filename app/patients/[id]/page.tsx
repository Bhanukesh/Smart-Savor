import Link from "next/link";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import PatientLocalNav from "@/components/PatientLocalNav";
import InvitePanel from "@/components/InvitePanel";
import DeletePatientButton from "@/components/DeletePatientButton";
import { getPatient, getFocusSet, getCycleConfirmedAt, getApprovedList, getMessages } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatientOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const focus = await getFocusSet(id);
  const confirmedAt = await getCycleConfirmedAt(id);
  const topGap = focus.find((f) => !f.excluded)?.gap;
  const approvedList = topGap ? await getApprovedList(id, topGap.nutrient) : null;
  const messages = await getMessages(id);
  const lastMessage = messages[messages.length - 1];

  return (
    <>
      <Topbar
        context="Dietitian console"
        who={
          <>
            <i className="ph ph-stethoscope ic-primary" /> {patient.dietitianName}
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <PatientLocalNav patientId={patient.id} patientName={patient.name} />

        <p className="eyebrow">Patient Profile</p>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ margin: 0 }}>
            {patient.name}, {patient.age}
          </h1>
          <DeletePatientButton patientId={patient.id} patientName={patient.name} />
        </div>

        <div className="card">
          <h2>
            <i className="ph ph-identification-badge ic-primary" /> Snapshot
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

        <InvitePanel patientId={patient.id} patientFirstName={patient.name.split(" ")[0]} />

        <div className="grid two">
          <Link href={`/patients/${patient.id}/prioritize`} className="card">
            <h2>
              <i className="ph ph-list-numbers ic-primary" /> Focus Set
            </h2>
            <p className="sub" style={{ margin: 0 }}>
              {focus.length} gap{focus.length === 1 ? "" : "s"} ranked
              {confirmedAt ? " · confirmed" : " · not yet confirmed"}
            </p>
          </Link>
          <Link href={`/patients/${patient.id}/ratify`} className="card">
            <h2>
              <i className="ph ph-check-square ic-primary" /> Swap Menu
            </h2>
            <p className="sub" style={{ margin: 0 }}>
              {topGap ? `${topGap.label}-lead` : "No active focus gap"}
              {approvedList ? ` · ${approvedList.status}` : ""}
            </p>
          </Link>
        </div>

        <Link href={`/patients/${patient.id}/messages`} className="card" style={{ display: "block" }}>
          <h2>
            <i className="ph ph-chat-circle-dots ic-primary" /> Messages
          </h2>
          <p className="sub" style={{ margin: 0 }}>
            {lastMessage ? lastMessage.body : "No messages yet"}
          </p>
        </Link>
      </main>
    </>
  );
}
