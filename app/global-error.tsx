"use client";

import { useEffect } from "react";

// Catches an error thrown by the root layout itself — the one case app/error.tsx can't catch,
// since that boundary lives *inside* the layout. Next requires this file to render its own
// <html>/<body>, since it fully replaces the root layout when it fires. Deliberately minimal
// (inline styles, no design-system CSS) — if the layout itself is broken, this shouldn't
// depend on anything that could be broken too.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f8fc", margin: 0 }}>
        <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, color: "#0f172a" }}>Smart Savor couldn&apos;t load</h1>
          <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.5 }}>
            Something went wrong loading the app itself — try again in a moment.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16, padding: "10px 20px", borderRadius: 999, border: "none",
              background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
