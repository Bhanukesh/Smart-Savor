import Link from "next/link";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import { getSessionPatient, computeDashboard, getWeightCheckIns } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const patient = await getSessionPatient();
  if (!patient) notFound();
  const gauges = await computeDashboard(patient.id);
  const inRangeCount = gauges.filter((g) => g.inRange).length;
  const checkIns = await getWeightCheckIns(patient.id, 4);

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Your week"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Your week</p>
        <h1>
          You&apos;re <em>trending up</em>, {patient.name.split(" ")[0]}
        </h1>
        <p className="sub">
          {gauges.length} target{gauges.length === 1 ? "" : "s"} from {patient.dietitianName.split(",")[0]}&apos;s
          focus set, tracked from what you&apos;ve logged this week.{" "}
          {inRangeCount === 0
            ? "Still moving toward range on all of them."
            : inRangeCount === gauges.length
              ? "All of them are already in range."
              : `${inRangeCount} already in range — the rest are moving the right way.`}
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

        {checkIns.length > 0 && (
          <div className="card pad-lg">
            <h2>
              <i className="ph ph-chart-line-up ic-primary" /> Weight check-ins{" "}
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--muted-foreground)" }}>Last 4 weeks</span>
            </h2>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 64, marginBottom: 10 }}>
              {(() => {
                const max = Math.max(...checkIns.map((c) => c.weightLb));
                const min = Math.min(...checkIns.map((c) => c.weightLb));
                const span = Math.max(1, max - min);
                return checkIns.map((c, i) => {
                  const pct = 30 + ((c.weightLb - min) / span) * 70;
                  const isLast = i === checkIns.length - 1;
                  return (
                    <div
                      key={c.id}
                      title={`${c.weightLb} lb`}
                      style={{
                        flex: 1, height: `${pct}%`, borderRadius: 4,
                        background: isLast ? "var(--primary)" : "var(--muted)",
                      }}
                    />
                  );
                });
              })()}
            </div>
            <p className="cap" style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>
              {checkIns[0].weightLb} lb → {checkIns[checkIns.length - 1].weightLb} lb, logged{" "}
              {checkIns.length} time{checkIns.length === 1 ? "" : "s"} in the last 4 weeks ·{" "}
              <Link href="/me/profile#weight" style={{ textDecoration: "underline" }}>log a new one</Link>
            </p>
          </div>
        )}

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
