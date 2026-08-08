import type { NutrientHistory } from "@/lib/types";

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  in_progress: { cls: "blue", label: "In progress" },
  closed: { cls: "green", label: "Closed" },
  carried_forward: { cls: "amber", label: "Carried forward" },
  deferred: { cls: "ghost", label: "Deferred" },
};

export default function CycleHistoryBoard({ history }: { history: NutrientHistory[] }) {
  if (history.length === 0) {
    return (
      <div className="card pad-lg">
        <p className="sub" style={{ margin: 0 }}>
          No cycle history yet — this fills in once your first 3-month cycle wraps up.
        </p>
      </div>
    );
  }

  return (
    <>
      {history.map((h) => (
        <div className="card pad-lg" key={h.nutrient}>
          <h2>{h.label}</h2>
          <p className="sub" style={{ margin: "0 0 4px" }}>
            Target: {h.targetValue} {h.unit}/day
          </p>
          {h.cycles.map((c, i) => {
            const status = STATUS_CHIP[c.outcomeStatus] ?? STATUS_CHIP.in_progress;
            const label = c.cycleSlug ? c.cycleSlug.split("-").pop()?.toUpperCase() : `Cycle ${i + 1}`;
            return (
              <div className="row" key={c.cycleId}>
                <div className="rank" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                  {i + 1}
                </div>
                <div className="grow">
                  <div className="title">
                    {label} <span className={`chip ${status.cls}`}>{status.label}</span>
                    {c.improved !== undefined && (
                      <span className={`chip ${c.improved ? "green" : "amber"}`}>
                        <i className={`ph-bold ${c.improved ? "ph-check" : "ph-minus"}`} /> {c.improved ? "Improved" : "No change"}
                      </span>
                    )}
                  </div>
                  <div className="meta">
                    {c.retestValue !== undefined
                      ? `Baseline ${c.baselineValue} ${h.unit} → retest ${c.retestValue} ${h.unit}${c.delta !== undefined ? ` (${c.delta >= 0 ? "+" : ""}${c.delta} ${h.unit})` : ""}`
                      : `Baseline ${c.baselineValue} ${h.unit} → retest not taken yet`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
