"use client";

import { useRef, useState } from "react";
import { computeChoice } from "@/lib/recompute";
import type { ApprovedListItem, ChoiceResult } from "@/lib/types";

export default function GapSwapSection({
  patientId,
  nutrientLabel,
  unit,
  gapRemaining,
  initialItems,
}: {
  patientId: string;
  nutrientLabel: string;
  unit: string;
  gapRemaining: number;
  initialItems: ApprovedListItem[];
}) {
  const items = initialItems;
  const [selected, setSelected] = useState<string | null>(items[0]?.id ?? null);
  const [result, setResult] = useState<ChoiceResult | null>(
    items[0]
      ? computeChoice({
          foodName: items[0].foodName, prep: items[0].prep, servingDescription: items[0].servingDescription,
          amountPerServing: items[0].amountPerServing, approved: items[0].status === "approved",
          gapRemaining, gapUnit: unit,
        })
      : null,
  );
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function preview(item: ApprovedListItem): ChoiceResult {
    return computeChoice({
      foodName: item.foodName, prep: item.prep, servingDescription: item.servingDescription,
      amountPerServing: item.amountPerServing, approved: item.status === "approved",
      gapRemaining, gapUnit: unit,
    });
  }

  function pick(item: ApprovedListItem) {
    setSelected(item.id);
    setResult(preview(item));
    fetch(`/api/patients/${patientId}/choices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approvedListItemId: item.id, gapRemaining }),
    }).catch(() => {});
  }

  function onKey(e: React.KeyboardEvent, index: number) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(items[index]);
      return;
    }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[e.key];
    if (step) {
      e.preventDefault();
      const next = cardRefs.current[index + step];
      if (next) next.focus();
    }
  }

  if (items.length === 0) {
    return (
      <div className="card pad-lg">
        <h2>
          <i className="ph ph-swap ic-primary" /> Pick your {nutrientLabel} food
        </h2>
        <p className="sub" style={{ margin: "8px 0" }}>
          No approved foods yet for {nutrientLabel} — check back once Maria ratifies this menu.
        </p>
      </div>
    );
  }

  return (
    <div className="card pad-lg">
      <h2>
        <i className="ph ph-swap ic-primary" /> Pick your {nutrientLabel} food
      </h2>

      <div className="foodgrid">
        {items.map((it, i) => {
          const active = it.id === selected;
          return (
            <button
              key={it.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={`food${active ? " active" : ""}`}
              aria-pressed={active}
              onClick={() => pick(it)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="pick">
                <i className="ph-bold ph-check" /> Selected
              </span>
              <span className="fname">
                <i className={`ph-fill ${it.icon} ic-primary`} /> {it.foodName}
              </span>
              <span className="fmeta">
                ~{it.amountPerServing} {unit} {nutrientLabel} per {it.servingDescription.replace(/^1\s+/, "")}
                {it.prep && ` (${it.prep})`}
              </span>
            </button>
          );
        })}
      </div>

      {result && (
        <div className="result" aria-live="polite">
          <div className="big">{result.servingsText}</div>
          <p style={{ fontSize: "13.5px", color: "var(--muted-foreground)", margin: "6px 0 12px" }}>
            closes your {result.gapRemaining} {result.gapUnit} {nutrientLabel} gap for today
          </p>
          <div className="stamp">
            <i className="ph-fill ph-seal-check ic-primary" /> Still within Maria&apos;s approved plan
          </div>
        </div>
      )}
    </div>
  );
}
