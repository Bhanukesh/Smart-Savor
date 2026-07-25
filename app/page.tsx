import Link from "next/link";
import Topbar from "@/components/Topbar";

export default function Home() {
  return (
    <>
      <Topbar />
      <main className="wrap">
        <p className="eyebrow">Adherence &amp; outcomes for dietitians</p>
        <h1>
          Your doctor tells your body what it needs — <em>you</em> decide what&apos;s on your plate.
        </h1>
        <p className="sub">
          Smart Savor ingests a patient&apos;s real grocery history, lets them <b>choose</b> the
          gap-closing swaps their dietitian has ratified, and proves the diet worked with periodic
          labs. Pick a portal to walk the loop.
        </p>

        <div className="grid two" style={{ marginTop: 8 }}>
          <Link href="/rx" className="card">
            <p className="stage-badge">
              <i className="ph ph-stethoscope" /> Dietitian console
            </p>
            <h2>
              <i className="ph ph-list-numbers ic-primary" /> /rx — command center
            </h2>
            <p className="sub" style={{ margin: 0 }}>
              Prioritize the cycle&apos;s focus set, then ratify the agent-drafted swap menu.
              Nothing reaches the patient without your sign-off.
            </p>
          </Link>

          <Link href="/me/swap" className="card featured">
            <p className="stage-badge">
              <i className="ph-fill ph-star" /> Patient app · the hero
            </p>
            <h2>
              <i className="ph ph-swap ic-primary" /> /me — choose your food
            </h2>
            <p className="sub" style={{ margin: 0 }}>
              Pick any food on the ratified menu; the agent recomputes the amount to still hit the
              target. Same goal, a food you&apos;ll actually eat.
            </p>
          </Link>
        </div>

        <p className="note">
          <strong>
            <i className="ph ph-flask ic-primary" /> Demo data:
          </strong>{" "}
          seeded with one patient (Sam Rivera). Every screen reads and writes real Postgres via
          Prisma, and the ratify screen's &quot;Add candidate&quot; sources live from the
          8,986-row Walmart×USDA reference table — no mocks.
        </p>
      </main>
    </>
  );
}
