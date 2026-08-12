import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import InviteColleagueForm from "@/components/InviteColleagueForm";
import { getSessionDietitian, listPracticeColleagues } from "@/lib/auth/dietitian";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const dietitian = await getSessionDietitian();
  if (!dietitian) redirect("/login/dietitian");

  const colleagues = await listPracticeColleagues(dietitian.practiceId);

  return (
    <>
      <Topbar
        context="Dietitian console"
        showAccountMenu
        who={
          <>
            <i className="ph ph-stethoscope ic-primary" /> {dietitian.dietitianName}
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Dietitian · Practice</p>
        <h1>
          Your <em>team</em>
        </h1>
        <p className="sub">
          Invite-only, same as patients — a colleague only gets in with an invite sent to their
          exact email.
        </p>

        <InviteColleagueForm />

        <div className="card">
          <h2>
            <i className="ph ph-users-three ic-primary" /> {colleagues.length} colleague{colleagues.length === 1 ? "" : "s"}
          </h2>
          {colleagues.map((c) => (
            <div className="row" key={c.id}>
              <div className="grow">
                <div className="title">
                  {c.name}
                  <span className={`chip ${c.status === "active" ? "green" : "amber"}`}>
                    {c.status === "active" ? "Active" : "Pending"}
                  </span>
                </div>
                <div className="meta">{c.email ?? "Invite not yet accepted"}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
