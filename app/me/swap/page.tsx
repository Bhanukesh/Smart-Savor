import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import GapSwapSection from "@/components/GapSwapSection";
import { getSessionPatient, getFocusSet, getApprovedList } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SwapPage() {
  const patient = await getSessionPatient();
  if (!patient) notFound();

  const focus = await getFocusSet(patient.id);
  const activeGaps = focus.filter((f) => !f.excluded);
  const sections = await Promise.all(
    activeGaps.map(async (f) => ({
      gap: f.gap,
      list: await getApprovedList(patient.id, f.gap.nutrient),
    })),
  );

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Your plan"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Your move · {activeGaps.length} focus area{activeGaps.length === 1 ? "" : "s"}</p>
        <h1>
          What&apos;s on <em>your plate</em>, {patient.name.split(" ")[0]}?
        </h1>
        <p className="sub">
          Every food below is already approved by {patient.dietitianName.split(",")[0]} — pick anything
          and we&apos;ll do the math for you, one card per gap she&apos;s asked you to work on.
        </p>

        {sections.map(({ gap, list }) => {
          const gapRemaining = gap.targetValue - gap.currentValue;
          return (
            <GapSwapSection
              key={gap.id}
              patientId={patient.id}
              nutrientLabel={gap.label}
              unit={gap.unit}
              gapRemaining={gapRemaining}
              initialItems={(list?.items ?? []).filter((i) => i.status === "approved")}
            />
          );
        })}

        <p className="note">
          <strong>
            <i className="ph ph-orange-slice ic-primary" /> Pair boost:
          </strong>{" "}
          a squeeze of lemon or a few bell pepper strips alongside an iron pick helps your body absorb
          plant iron — and counts toward your vitamin C goal too.
        </p>
        <p className="note honesty">
          <strong>
            <i className="ph ph-eye ic-primary" /> Honest note:
          </strong>{" "}
          amounts are estimates from standard nutrition data, not a prescription. Log what you
          actually eat and your dashboard updates from that.
        </p>
        <p className="footer-tip">
          Tip: move between foods in a card with <span className="kbd">←</span> <span className="kbd">→</span>{" "}
          <span className="kbd">↑</span> <span className="kbd">↓</span> and select with{" "}
          <span className="kbd">Enter</span>
        </p>
      </main>
    </>
  );
}
