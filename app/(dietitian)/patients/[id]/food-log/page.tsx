import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import PatientLocalNav from "@/components/PatientLocalNav";
import { getPatient, getRecentConsumption } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  photo: "photo", voice: "voice", text: "typed", nudge_confirmed: "nudge", inferred: "inferred",
};

// Dietitian-facing read-only view of a patient's Quick Log — the same consumption_events the
// patient's own /me/log writes to and the dashboard gauges read from, just not previously
// surfaced anywhere on the dietitian console at all.
export default async function PatientFoodLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const entries = await getRecentConsumption(id, 30);

  return (
    <>
      <Topbar
        context="Dietitian console"
        showAccountMenu
        who={
          <>
            <i className="ph ph-stethoscope ic-primary" /> {patient.dietitianName}
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <PatientLocalNav patientId={patient.id} patientName={patient.name} />

        <p className="eyebrow">{patient.name} · Food Log</p>
        <h1>
          What {patient.name.split(" ")[0]}&apos;s been <em>eating</em>
        </h1>
        <p className="sub">
          Every Quick Log entry from the last 30 days — photo, voice, or typed. A logged food only
          counts toward the dashboard gauges once it matches something on the ratified swap menu;
          everything else still shows up here.
        </p>

        <div className="card">
          <h2>
            <i className="ph ph-fork-knife ic-primary" /> Recent entries
          </h2>
          {entries.length === 0 ? (
            <p className="sub" style={{ margin: 0 }}>Nothing logged in the last 30 days.</p>
          ) : (
            entries.map((e) => (
              <div className="row" key={e.id}>
                <div className="grow">
                  <div className="title">
                    {e.foodName}
                    {e.flag === "needs_review" && <span className="chip amber">Needs review</span>}
                  </div>
                  <div className="meta">
                    {new Date(e.consumedDate).toLocaleDateString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                    })}{" "}
                    · {e.quantityServings} serving{e.quantityServings === 1 ? "" : "s"} · via {SOURCE_LABEL[e.source] ?? e.source}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
