import Link from "next/link";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import { getDemoPatient, getApprovedList } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const CHIP: Record<string, string> = { approved: "green", flagged: "amber", excluded: "red" };
const CHIP_LABEL: Record<string, string> = { approved: "Approved", flagged: "Flagged", excluded: "Excluded" };
const RANK: Record<string, { cls: string; icon?: string; txt?: string }> = {
  approved: { cls: "ok", icon: "ph-check" },
  flagged: { cls: "warn", txt: "!" },
  excluded: { cls: "bad", icon: "ph-x" },
};

export default async function RatifyPage() {
  const patient = await getDemoPatient();
  if (!patient) notFound();
  const list = await getApprovedList(patient.id, "iron");
  if (!list) notFound();
  const count = list.items.length;

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

        <div className="card">
          <h2>
            <i className="ph ph-check-square ic-primary" /> {list.gap.label} swap menu — {count} candidates
          </h2>
          {list.items.map((it) => {
            const r = RANK[it.status];
            return (
              <div className="row" key={it.id}>
                <div className={`rank ${r.cls}`}>
                  {r.icon ? <i className={`ph-bold ${r.icon}`} /> : r.txt}
                </div>
                <div className="grow">
                  <div className="title" style={it.status === "excluded" ? { color: "var(--danger)" } : undefined}>
                    {it.foodName} {it.prep && `(${it.prep})`}
                    <span className={`chip ${CHIP[it.status]}`}>
                      {CHIP_LABEL[it.status]}{it.edited ? " · edited" : ""}
                    </span>
                  </div>
                  <div className="meta">
                    ~{it.amountPerServing} {it.unit} {list.gap.nutrient === "iron" ? "iron" : list.gap.label.toLowerCase()}/{it.servingDescription.replace(/^1\s*/, "")} · {it.note}
                  </div>
                </div>
                <div className="btn-row">
                  {it.status === "excluded" ? (
                    <button className="btn sm">Restore</button>
                  ) : it.status === "flagged" ? (
                    <>
                      <button className="btn sm primary">Approve</button>
                      <button className="btn sm">Edit</button>
                    </>
                  ) : (
                    <>
                      <button className="btn sm">Edit</button>
                      <button className="btn sm">Remove</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <div className="btn-row" style={{ marginTop: 16 }}>
            <Link className="btn primary" href="/me/swap">
              Publish ratified menu to {patient.name.split(" ")[0]} <i className="ph-bold ph-arrow-right" />
            </Link>
            <button className="btn">Add candidate</button>
          </div>
        </div>

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
