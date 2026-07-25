import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import RatifyBoard from "@/components/RatifyBoard";
import { getDemoPatient, getApprovedList } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RatifyPage() {
  const patient = await getDemoPatient();
  if (!patient) notFound();
  const list = await getApprovedList(patient.id, "iron");
  if (!list) notFound();

  return (
    <>
      <Topbar
        context="Dietitian console"
        who={
          <>
            <i className="ph ph-stethoscope ic-primary" /> Signed in: <b>{patient.dietitianName}</b> ·
            Patient: <b>{patient.name}, {patient.age}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Dietitian · Stage D2/D3</p>
        <h1>
          Ratify the <em>swap menu</em>
        </h1>
        <p className="sub">
          Candidates generated from the confirmed focus set (iron-lead), screened against
          comorbidities and current labs. Approve, edit, or remove — only ratified items reach {patient.name.split(" ")[0]}.
        </p>

        <p className="note">
          <strong>
            <i className="ph ph-funnel ic-primary" /> Screening constraints:
          </strong>{" "}
          Type 2 (added sugar, glycemic load) · cardiac + LDL 151 / TG 210 (saturated fat,
          cholesterol) · BP 138/88 (sodium). Applied to every candidate below.
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
          his choice is free <em>because</em> the menu is ratified.
        </p>
      </main>
    </>
  );
}
