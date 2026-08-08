import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import LabReportReview from "@/components/LabReportReview";
import { getDemoPatient, getLabReportDetail } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LabReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const patient = await getDemoPatient();
  if (!patient) notFound();
  const report = await getLabReportDetail(patient.id, reportId);
  if (!report) notFound();

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Review lab report"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Review</p>
        <h1>
          Confirm your <em>results</em>
        </h1>
        <p className="sub">Confirm what looks right — anything you reject won&apos;t reach your dietitian.</p>

        <LabReportReview patientId={patient.id} report={report} />
      </main>
    </>
  );
}
