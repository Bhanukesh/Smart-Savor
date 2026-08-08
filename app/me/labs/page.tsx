import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import LabReportUpload from "@/components/LabReportUpload";
import { getDemoPatient, getLabReports } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LabsPage() {
  const patient = await getDemoPatient();
  if (!patient) notFound();
  const labReports = await getLabReports(patient.id);

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Lab reports"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Lab Reports</p>
        <h1>
          What&apos;s your <em>bloodwork</em> saying, {patient.name.split(" ")[0]}?
        </h1>
        <p className="sub">Upload a lab report and we&apos;ll pull out anything relevant — your dietitian reviews before it changes your plan.</p>

        <LabReportUpload patientId={patient.id} initialReports={labReports} />
      </main>
    </>
  );
}
