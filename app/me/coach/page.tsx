import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import CoachChat from "@/components/CoachChat";
import { getDemoPatient } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const patient = await getDemoPatient();
  if (!patient) notFound();

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Your coach"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Talk it through</p>
        <h1>
          Ask your <em>food coach</em>, {patient.name.split(" ")[0]}
        </h1>
        <p className="sub">
          Everything it offers comes straight from {patient.dietitianName.split(",")[0]}&apos;s ratified
          plan — same math as the swap screen, just conversational.
        </p>

        <CoachChat patientId={patient.id} patientFirstName={patient.name.split(" ")[0]} />

        <p className="note honesty">
          <strong>
            <i className="ph ph-eye ic-primary" /> Honest note:
          </strong>{" "}
          the coach only ever offers foods from your dietitian&apos;s approved list — it can&apos;t
          change a target or add anything she hasn&apos;t signed off on.
        </p>
      </main>
    </>
  );
}
