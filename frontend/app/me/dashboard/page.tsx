import Link from "next/link";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import { getDashboard } from "@/lib/api";

export default async function DashboardPage() {
  const gauges = await getDashboard();

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Your week"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>Sam Rivera</b> · plan by <b>Maria, RD</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Your week · Jul 6 – 12</p>
        <h1>
          You&apos;re <em>trending up</em>, Sam
        </h1>
        <p className="sub">
          Three targets from Maria&apos;s focus set, tracked from what you&apos;ve logged this week.
          One is already in range — the other two are moving the right way.
        </p>

        <div className="card pad-lg">
          <h2>
            <i className="ph ph-chart-line ic-primary" /> Intake toward target
          </h2>
          {gauges.map((g) => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100));
            return (
              <div className="gauge" key={g.label}>
                <div className="lab">
                  <span>
                    <i className={`ph ${g.icon} ${g.inRange ? "ic-success" : "ic-primary"}`} /> {g.label}
                  </span>
                  {g.inRange ? (
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>
                      {g.current} / {g.target} {g.unit} <i className="ph-bold ph-check" /> in range
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {g.current} / {g.target} {g.unit}
                    </span>
                  )}
                </div>
                <div className="track">
                  <div className={`fill${g.inRange ? " done" : ""}`} style={{ width: `${pct}%` }} />
                  <div className="target" style={{ left: "100%" }} />
                </div>
                <div className="cap">{g.caption}</div>
              </div>
            );
          })}
        </div>

        <p className="note">
          <strong>
            <i className="ph ph-sparkle ic-primary" /> This week&apos;s nudge:
          </strong>{" "}
          two more iron-forward lunches — the lentils or chickpeas you&apos;ve already unlocked on the{" "}
          <Link href="/me/swap" style={{ textDecoration: "underline" }}>swap screen</Link> — and
          you&apos;ll likely close that last 3 mg by Sunday.
        </p>
        <p className="note honesty">
          <strong>
            <i className="ph ph-eye ic-primary" /> Honest note:
          </strong>{" "}
          intake toward target, from logged foods — not a blood level. Your next panel with your care
          team is what confirms the real change.
        </p>
      </main>
    </>
  );
}
