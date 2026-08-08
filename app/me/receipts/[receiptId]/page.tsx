import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import ReceiptReview from "@/components/ReceiptReview";
import { getDemoPatient, getReceiptDetail } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params;
  const patient = await getDemoPatient();
  if (!patient) notFound();
  const receipt = await getReceiptDetail(patient.id, receiptId);
  if (!receipt) notFound();

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Review receipt"
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
          Is this <em>yours</em>?
        </h1>
        <p className="sub">Confirm what you actually eat — anything you exclude won&apos;t count toward your habits.</p>

        <ReceiptReview patientId={patient.id} receipt={receipt} />
      </main>
    </>
  );
}
