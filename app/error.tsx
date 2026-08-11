"use client";

import { useEffect } from "react";

// Root error boundary — catches any render/data error inside a page (e.g. the database being
// unreachable) that would otherwise fall through to Next's bare, unstyled default error screen.
// Segment-specific pages can add their own error.tsx later if they need tailored messaging;
// this one covers every route that doesn't.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <main className="wrap narrow">
      <div className="card pad-lg" style={{ textAlign: "center" }}>
        <i className="ph ph-plug ic-primary" style={{ fontSize: 40 }} />
        <h1 style={{ marginTop: 12 }}>Something went wrong</h1>
        <p className="sub" style={{ margin: "0 auto 20px", maxWidth: "40ch" }}>
          The page couldn&apos;t load — this is usually temporary. Try again, or come back in a
          moment if it keeps happening.
        </p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <button className="btn primary" onClick={() => reset()}>
            <i className="ph-bold ph-arrow-clockwise" /> Try again
          </button>
          <a className="btn" href="/">
            Back to start
          </a>
        </div>
      </div>
    </main>
  );
}
