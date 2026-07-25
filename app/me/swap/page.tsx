"use client";

import { useEffect, useRef, useState } from "react";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import { computeChoice } from "@/lib/recompute";
import type { ApprovedListItem, ChoiceResult } from "@/lib/types";

const GAP_REMAINING = 9; // mg of iron left today (9 of 18 logged)

export default function SwapPage() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [items, setItems] = useState<ApprovedListItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ChoiceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // shared recompute (same code the server persists with) — instant, no round-trip
  function preview(item: ApprovedListItem): ChoiceResult {
    return computeChoice({
      foodName: item.foodName,
      prep: item.prep,
      servingDescription: item.servingDescription,
      amountPerServing: item.amountPerServing,
      approved: item.status === "approved",
      gapRemaining: GAP_REMAINING,
      gapUnit: "mg",
    });
  }

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const patients = await fetch("/api/patients").then((r) => r.json());
        const id: string | undefined = patients?.[0]?.id;
        if (!id || !live) return setLoading(false);
        setPatientId(id);
        const list = await fetch(`/api/patients/${id}/approved-lists/iron`).then((r) => r.json());
        if (!live) return;
        const approved: ApprovedListItem[] = (list?.items ?? []).filter(
          (i: ApprovedListItem) => i.status === "approved",
        );
        setItems(approved);
        setLoading(false);
        if (approved[0]) {
          setSelected(approved[0].id);
          setResult(preview(approved[0]));
        }
      } catch {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  function pick(item: ApprovedListItem) {
    setSelected(item.id);
    setResult(preview(item)); // instant UI
    if (patientId) {
      // persist the choice; the server recomputes + records it (insert-only history)
      fetch(`/api/patients/${patientId}/choices`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvedListItemId: item.id, gapRemaining: GAP_REMAINING }),
      }).catch(() => {});
    }
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

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Your plan"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>Sam Rivera</b> · plan by <b>Maria, RD</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Your move · Iron</p>
        <h1>
          What&apos;s on <em>your plate</em>, Sam?
        </h1>
        <p className="sub">
          You have <b>9 mg of iron</b> to go today (9 of 18 logged). Pick any food below — every one
          is already approved by Maria — and we&apos;ll do the math for you.
        </p>

        <div className="card pad-lg">
          <h2>
            <i className="ph ph-swap ic-primary" /> Pick your iron food
          </h2>

          {loading ? (
            <p className="sub" style={{ margin: "8px 0" }}>Loading your approved menu…</p>
          ) : (
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
                      ~{it.amountPerServing} mg iron per {it.servingDescription.replace(/^1\s+/, "")}
                      {it.prep && ` (${it.prep})`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {result && (
            <div className="result" aria-live="polite">
              <div className="big">{result.servingsText}</div>
              <p style={{ fontSize: "13.5px", color: "var(--muted-foreground)", margin: "6px 0 12px" }}>
                closes your {result.gapRemaining} {result.gapUnit} iron gap for today
              </p>
              <div className="stamp">
                <i className="ph-fill ph-seal-check ic-primary" /> Still within Maria&apos;s approved plan
              </div>
            </div>
          )}
        </div>

        <p className="note">
          <strong>
            <i className="ph ph-orange-slice ic-primary" /> Pair boost:
          </strong>{" "}
          a squeeze of lemon or a few bell pepper strips alongside helps your body absorb plant iron —
          and counts toward your vitamin C goal too.
        </p>
        <p className="note honesty">
          <strong>
            <i className="ph ph-eye ic-primary" /> Honest note:
          </strong>{" "}
          amounts are estimates from standard nutrition data, not a prescription. Log what you
          actually eat and your dashboard updates from that.
        </p>
        <p className="footer-tip">
          Tip: move between foods with <span className="kbd">←</span> <span className="kbd">→</span>{" "}
          <span className="kbd">↑</span> <span className="kbd">↓</span> and select with{" "}
          <span className="kbd">Enter</span>
        </p>
      </main>
    </>
  );
}
