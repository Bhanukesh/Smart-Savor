import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import ReceiptUpload from "@/components/ReceiptUpload";
import { getDemoPatient, getReceipts } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const patient = await getDemoPatient();
  if (!patient) notFound();
  const receipts = await getReceipts(patient.id);

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Receipts"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Grocery Receipts</p>
        <h1>
          What&apos;s in your <em>cart</em>, {patient.name.split(" ")[0]}?
        </h1>
        <p className="sub">Upload a receipt and we&apos;ll pull out the food items — you confirm what&apos;s actually yours.</p>

        <ReceiptUpload patientId={patient.id} initialReceipts={receipts} />
      </main>
    </>
  );
}
