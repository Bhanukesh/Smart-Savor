"use client";

import { useState } from "react";
import Link from "next/link";

/** D1.5 confirm gesture — reveals the "published" note and locks the button (prototype parity). */
export default function ConfirmFocusSet() {
  const [published, setPublished] = useState(false);
  return (
    <>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button
          className="btn primary"
          disabled={published}
          onClick={() => setPublished(true)}
        >
          Confirm focus set <i className="ph-bold ph-arrow-right" />
        </button>
        <button className="btn">Override ranking</button>
      </div>
      {published && (
        <p className="note safe">
          <strong>
            <i className="ph ph-check-circle" /> Published:
          </strong>{" "}
          Focus set confirmed and sent to swap-menu generation.{" "}
          <Link href="/rx/ratify" style={{ textDecoration: "underline" }}>
            Continue to Ratify (D2/D3) →
          </Link>
        </p>
      )}
    </>
  );
}
