"use client";

import { useState } from "react";
import type { MessageEntry } from "@/lib/types";

export default function MessageThread({
  patientId,
  senderRole,
  initialMessages,
  title,
}: {
  patientId: string;
  senderRole: "patient" | "dietitian";
  initialMessages: MessageEntry[];
  title: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, senderRole }),
      });
      if (!res.ok) throw new Error("send failed");
      const created: MessageEntry = await res.json();
      setMessages((prev) => [...prev, created]);
      setDraft("");
    } catch {
      setError("Couldn't send that — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card pad-lg" style={{ display: "flex", flexDirection: "column", height: "min(68vh, 600px)" }}>
      <h2 style={{ marginBottom: 14 }}>
        <i className="ph ph-chat-circle-dots ic-primary" /> {title}
      </h2>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "2px 2px 6px" }}>
        {messages.length === 0 ? (
          <p className="sub" style={{ margin: "auto", textAlign: "center" }}>No messages yet — say hello.</p>
        ) : (
          messages.map((m) => {
            const own = m.senderRole === senderRole;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: own ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                  background: own ? "var(--primary)" : "var(--muted)",
                  color: own ? "var(--primary-foreground)" : "var(--foreground)",
                  borderRadius: "var(--radius-sm)",
                  padding: "9px 13px",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.body}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="btn-row" style={{ marginTop: 12 }}>
        <input
          className="field" style={{ flex: 1 }} placeholder="Type a message…"
          value={draft} onChange={(e) => setDraft(e.target.value)} disabled={sending}
        />
        <button className="btn primary" type="submit" disabled={sending || !draft.trim()}>
          <i className="ph-bold ph-paper-plane-tilt" /> Send
        </button>
      </form>
      {error && (
        <p className="note" style={{ marginTop: 10 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}
    </div>
  );
}
