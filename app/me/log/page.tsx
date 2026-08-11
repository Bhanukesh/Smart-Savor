import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import QuickLogForm from "@/components/QuickLogForm";
import { getSessionPatient, getRecentConsumption } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const patient = await getSessionPatient();
  if (!patient) notFound();

  const entries = await getRecentConsumption(patient.id, 14);

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Log"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Quick Log</p>
        <h1>
          What did you eat, <em>{patient.name.split(" ")[0]}</em>?
        </h1>
        <p className="sub">Snap a photo, say it out loud, or type it — whatever&apos;s fastest.</p>

        <QuickLogForm patientId={patient.id} initialEntries={entries} />

        <p className="note honesty">
          <strong>
            <i className="ph ph-eye ic-primary" /> Honest note:
          </strong>{" "}
          a logged food only counts toward your dashboard gauges once it matches something on your
          dietitian&apos;s ratified list — everything else still logs here for your own record.
        </p>
      </main>
    </>
  );
}
