import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import CycleHistoryBoard from "@/components/CycleHistoryBoard";
import { getSessionPatient, getCycleHistory } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const patient = await getSessionPatient();
  if (!patient) notFound();
  const history = await getCycleHistory(patient.id);

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="History"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Your Progress History</p>
        <h1>
          How far you&apos;ve <em>come</em>, {patient.name.split(" ")[0]}
        </h1>
        <p className="sub">Every 3-month cycle, tracked side by side — baseline vs. retest, gap by gap.</p>

        <CycleHistoryBoard history={history} />

        <p className="note honesty">
          <strong>
            <i className="ph ph-eye ic-primary" /> Honest note:
          </strong>{" "}
          retest values come from lab work your dietitian uploads — not estimated from logged foods.
        </p>
      </main>
    </>
  );
}
