import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import PatientLocalNav from "@/components/PatientLocalNav";
import RatifyBoard from "@/components/RatifyBoard";
import { getPatient, getApprovedList, getFocusSet } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatientRatifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  // Ratify the patient's top active focus gap — not hardcoded to "iron", so this works for
  // whichever nutrient actually leads this patient's focus set (may have no approved list yet).
  const focus = await getFocusSet(id);
  const topGap = focus.find((f) => !f.excluded)?.gap;
  const list = topGap ? await getApprovedList(id, topGap.nutrient) : null;
  if (!topGap || !list) notFound();

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

        <p className="eyebrow">{patient.name} · Stage D2/D3</p>
        <h1>
          Ratify the <em>swap menu</em>
        </h1>
        <p className="sub">
          Candidates generated from the confirmed focus set ({topGap.label}-lead), screened against
          comorbidities and current labs. Approve, edit, or remove — only ratified items reach {patient.name.split(" ")[0]}.
        </p>

        <p className="note">
          <strong>
            <i className="ph ph-funnel ic-primary" /> Screening constraints:
          </strong>{" "}
          {patient.conditions.length > 0 ? patient.conditions.join(" · ") : "No conditions on file"} ·
          BP {patient.bpSystolic}/{patient.bpDiastolic}. Applied to every candidate below.
        </p>

        <RatifyBoard
          patientId={patient.id}
          patientFirstName={patient.name.split(" ")[0]}
          nutrient={list.gap.nutrient}
          nutrientLabel={list.gap.label}
          initialItems={list.items}
        />

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
