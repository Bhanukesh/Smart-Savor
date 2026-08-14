import type { DashboardGaugeDay } from "@/lib/types";

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

/** Last-7-days on-track/off-track row — one checkbox-style dot per day, green if that day's
 * running total (baseline + everything logged through that day) had reached target, red if not.
 * Shared between the patient dashboard's "Intake toward target" gauges and the dietitian's
 * focus-set rows, so both read the same on-track definition. */
export default function DayTrackRow({ history }: { history: DashboardGaugeDay[] }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      {history.map((day) => {
        const isToday = day.date === todayKey;
        const letter = DAY_LETTER[new Date(`${day.date}T00:00:00`).getDay()];
        return (
          <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              title={`${day.date} — ${day.onTrack ? "on track" : "off track"}`}
              style={{
                width: 20, height: 20, borderRadius: 999,
                background: day.onTrack ? "var(--success)" : "var(--danger)",
                color: "#fff", display: "grid", placeItems: "center", fontSize: 11,
                outline: isToday ? "2px solid var(--foreground)" : "none",
                outlineOffset: 2,
              }}
            >
              <i className={`ph-bold ${day.onTrack ? "ph-check" : "ph-x"}`} />
            </div>
            <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontWeight: isToday ? 700 : 500 }}>
              {letter}
            </span>
          </div>
        );
      })}
    </div>
  );
}
