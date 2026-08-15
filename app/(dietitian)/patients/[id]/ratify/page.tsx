import Link from "next/link";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import PatientLocalNav from "@/components/PatientLocalNav";
import RatifyBoard from "@/components/RatifyBoard";
import { getPatient, getApprovedList, getFocusSet, ensureApprovedList } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatientRatifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  // Every active (non-excluded) focus item gets its own swap menu to ratify, not just the
  // top-ranked one — a patient with several gaps needs candidates for each, not only their
  // single highest-priority deficiency.
  const focus = await getFocusSet(id);
  const activeGaps = focus.filter((f) => !f.excluded);
  if (activeGaps.length === 0) notFound();

  const sections = await Promise.all(
    activeGaps.map(async (f) => {
      await ensureApprovedList(id, f.gap.id);
      const list = await getApprovedList(id, f.gap.nutrient);
      return list;
    }),
  );

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

        <p className="eyebrow">{patient.name} · Stage D2/D3</p>
        <h1>
          Ratify the <em>swap menus</em>
        </h1>
        <p className="sub">
          Candidates for every active gap in the confirmed focus set, screened against
          comorbidities and current labs. Approve, edit, or remove — only ratified items reach{" "}
          {patient.name.split(" ")[0]}.
        </p>

        <p className="note">
          <strong>
            <i className="ph ph-funnel ic-primary" /> Screening constraints:
          </strong>{" "}
          {patient.conditions.length > 0 ? patient.conditions.join(" · ") : "No conditions on file"} ·
          BP {patient.bpSystolic}/{patient.bpDiastolic}. Applied to every candidate below.
        </p>

        {sections.map((list) =>
          list ? (
            <RatifyBoard
              key={list.gap.nutrient}
              patientId={patient.id}
              nutrient={list.gap.nutrient}
              nutrientLabel={list.gap.label}
              initialItems={list.items}
            />
          ) : null,
        )}

        <div className="btn-row" style={{ marginTop: 4, marginBottom: 20 }}>
          <Link className="btn primary" href="/me/swap">
            Publish ratified menus to {patient.name.split(" ")[0]} <i className="ph-bold ph-arrow-right" />
          </Link>
        </div>

        <p className="note safe">
          <strong>
            <i className="ph ph-check-circle" /> Clinically safe:
          </strong>{" "}
          Everything {patient.name.split(" ")[0]} can pick downstream has already passed this screen —
          their choice is free <em>because</em> the menu is ratified.
        </p>
      </main>
    </>
  );
}
