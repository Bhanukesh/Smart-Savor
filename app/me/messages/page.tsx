import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import MessageThread from "@/components/MessageThread";
import { getSessionPatient, getMessages } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const patient = await getSessionPatient();
  if (!patient) notFound();
  const messages = await getMessages(patient.id);

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Messages"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Secure Messages</p>
        <h1>
          Talk to <em>{patient.dietitianName.split(",")[0]}</em>
        </h1>
        <p className="sub">A private, secure thread — for questions between visits.</p>

        <MessageThread patientId={patient.id} senderRole="patient" initialMessages={messages} title={patient.dietitianName} />
      </main>
    </>
  );
}
