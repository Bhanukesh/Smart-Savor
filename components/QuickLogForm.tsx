"use client";

import { useRef, useState } from "react";
import type { ConsumptionEntry } from "@/lib/types";

type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionEventLike = { results: { [i: number]: { [j: number]: SpeechRecognitionResultLike } } };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

export default function QuickLogForm({
  patientId,
  initialEntries,
}: {
  patientId: string;
  initialEntries: ConsumptionEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [textDraft, setTextDraft] = useState("");
  const [showText, setShowText] = useState(false);
  const [busy, setBusy] = useState<null | "photo" | "voice" | "text">(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitLog(body: { source: "photo" | "voice" | "text"; text?: string; imageBase64?: string; mediaType?: string }) {
    setBusy(body.source);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/consumption`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("log failed");
      const created = await res.json();
      setEntries((prev) => [
        { id: created.id, foodName: created.foodName, quantityServings: created.quantityServings, consumedDate: created.consumedDate, source: created.source, flag: created.flag },
        ...prev,
      ]);
      setTextDraft("");
      setShowText(false);
    } catch {
      setError("Couldn't log that — try again.");
    } finally {
      setBusy(null);
    }
  }

  function onPhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      submitLog({ source: "photo", imageBase64: base64, mediaType: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function startVoice() {
    type SpeechWindow = Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const w = window as SpeechWindow;
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice logging isn't supported in this browser — try typing instead.");
      setShowText(true);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    setError(null);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      submitLog({ source: "voice", text: transcript });
    };
    recognition.onerror = () => {
      setError("Didn't catch that — try again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function submitText(e: React.FormEvent) {
    e.preventDefault();
    if (!textDraft.trim()) return;
    submitLog({ source: "text", text: textDraft.trim() });
  }

  return (
    <div className="card pad-lg">
      <h2>
        <i className="ph ph-fork-knife ic-primary" /> Log what you ate
      </h2>
      <p className="sub" style={{ margin: "0 0 16px" }}>
        Optional — only when you want. No forms, no daily pressure.
      </p>

      <div className="btn-row">
        <button className="btn primary" onClick={() => fileInputRef.current?.click()} disabled={busy !== null}>
          <i className="ph-bold ph-camera" /> {busy === "photo" ? "Reading photo…" : "Take a photo"}
        </button>
        <button className="btn" onClick={startVoice} disabled={busy !== null || listening}>
          <i className="ph-bold ph-microphone" /> {listening ? "Listening…" : busy === "voice" ? "Logging…" : "Say it out loud"}
        </button>
        <button className="btn" onClick={() => setShowText((s) => !s)} disabled={busy !== null}>
          <i className="ph-bold ph-pencil-simple" /> Type it
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoPicked} style={{ display: "none" }} />

      {showText && (
        <form onSubmit={submitText} className="btn-row" style={{ marginTop: 14 }}>
          <input
            className="field"
            style={{ flex: 1 }}
            placeholder="e.g. a cup of lentils with spinach"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            disabled={busy !== null}
          />
          <button className="btn primary" type="submit" disabled={busy !== null || !textDraft.trim()}>
            Log it
          </button>
        </form>
      )}

      {error && (
        <p className="note" style={{ marginTop: 14 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ fontWeight: 600, fontSize: "13.5px", marginBottom: 4, color: "var(--muted-foreground)" }}>RECENT</div>
        {entries.length === 0 ? (
          <p className="sub" style={{ margin: "8px 0 0" }}>Nothing logged yet — tap a button above whenever you eat something.</p>
        ) : (
          entries.map((e) => (
            <div className="row" key={e.id}>
              <div className="grow">
                <div className="title">
                  {e.foodName}
                  {e.flag === "needs_review" && <span className="chip amber">Needs review</span>}
                </div>
                <div className="meta">
                  {new Date(e.consumedDate).toLocaleDateString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} · via {e.source}
                </div>
              </div>
              <span className="chip green">
                <i className="ph-bold ph-check" /> Logged
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
