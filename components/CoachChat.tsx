"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function CoachChat({
  patientId,
  patientFirstName,
}: {
  patientId: string;
  patientFirstName: string;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi ${patientFirstName} — I'm your food coach. Ask me about your focus areas this cycle, or tell me what you'd like to eat and I'll find it on your approved list.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const history = messages;
    const next = [...history, { role: "user" as const, content: text }];
    setMessages(next);
    setDraft("");
    setSending(true);
    setError(false);
    scrollToEnd();
    try {
      const res = await fetch(`/api/patients/${patientId}/coach`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok) throw new Error("bad response");
      const data = (await res.json()) as { reply: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setError(true);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't reach the coach just now — try again in a moment." },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="card pad-lg" style={{ display: "flex", flexDirection: "column", height: "min(70vh, 640px)" }}>
      <h2 style={{ marginBottom: 14 }}>
        <i className="ph ph-chat-circle-dots ic-primary" /> Talk to your food coach
      </h2>

      <div
        ref={listRef}
        style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              background: m.role === "user" ? "var(--primary)" : "var(--muted)",
              color: m.role === "user" ? "var(--primary-foreground)" : "var(--foreground, inherit)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontSize: 14.5,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "var(--muted)",
              color: "var(--muted-foreground)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontSize: 14.5,
            }}
          >
            <i className="ph ph-circle-notch" style={{ animation: "spin 1s linear infinite" }} /> thinking…
          </div>
        )}
      </div>

      <div className="btn-row" style={{ marginTop: 14, alignItems: "flex-end" }}>
        <textarea
          className="field"
          rows={1}
          placeholder="Ask about a gap, or say what you'd like to eat…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          style={{ flex: 1, resize: "none", fontFamily: "inherit" }}
          disabled={sending}
        />
        <button className="btn primary" onClick={send} disabled={sending || !draft.trim()}>
          <i className="ph-bold ph-paper-plane-tilt" /> Send
        </button>
      </div>
      {error && (
        <p className="note" style={{ marginTop: 10 }}>
          <i className="ph ph-warning-circle ic-primary" /> Having trouble connecting — your messages above are safe, just try sending again.
        </p>
      )}
    </div>
  );
}
