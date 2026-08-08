import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import PatientLocalNav from "@/components/PatientLocalNav";
import MessageThread from "@/components/MessageThread";
import { getPatient, getMessages, markMessagesRead } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatientMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  await markMessagesRead(id);
  const messages = await getMessages(id);

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

        <p className="eyebrow">{patient.name} · Messages</p>
        <h1>
          Talk to <em>{patient.name.split(" ")[0]}</em>
        </h1>

        <MessageThread patientId={patient.id} senderRole="dietitian" initialMessages={messages} title={patient.name} />
      </main>
    </>
  );
}
