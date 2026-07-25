import Link from "next/link";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import { listPatients } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CaseloadPage() {
  const patients = await listPatients();

  return (
    <>
      <Topbar
        context="Dietitian console"
        who={
          <>
            <i className="ph ph-stethoscope ic-primary" /> {patients[0]?.dietitianName ?? "Dietitian"}
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Dietitian · Caseload</p>
        <h1>
          Your <em>patients</em>
        </h1>
        <p className="sub">
          Everyone on your caseload, one place. Pick a patient to prioritize their focus set or ratify
          their swap menu.
        </p>

        <div className="card">
          <h2>
            <i className="ph ph-users-three ic-primary" /> {patients.length} patient{patients.length === 1 ? "" : "s"}
          </h2>
          {patients.length === 0 ? (
            <p className="sub" style={{ margin: "8px 0" }}>No patients enrolled yet.</p>
          ) : (
            patients.map((p) => (
              <div className="row" key={p.id}>
                <div className="grow">
                  <div className="title">
                    {p.name}, {p.age}
                  </div>
                  <div className="meta">
                    {p.conditions.length > 0 ? p.conditions.join(" · ") : "No conditions on file"} ·
                    Dietitian: {p.dietitianName || "Unassigned"}
                  </div>
                </div>
                <div className="btn-row">
                  <Link className="btn sm" href={`/rx/prioritize?patient=${p.id}`}>
                    <i className="ph ph-list-numbers" /> Prioritize
                  </Link>
                  <Link className="btn sm" href={`/rx/ratify?patient=${p.id}`}>
                    <i className="ph ph-check-square" /> Ratify
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
