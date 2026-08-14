"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Fires once the Clerk sign-in redirect lands here — client-side because setting the patient
// session cookie (lib/invite.ts's signInReturningPatient -> createSession) has to happen inside
// the /api/invite/signin route handler, not during this page's server render.
export default function ReturningPatientSignIn() {
  const [state, setState] = useState<"checking" | "not_found" | "error">("checking");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/invite/signin", { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          router.replace(`/me/dashboard`);
          return;
        }
        setState(res.status === 404 ? "not_found" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "checking") {
    return (
      <div className="card pad-lg" style={{ textAlign: "center" }}>
        <p className="sub" style={{ margin: 0 }}>Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="card pad-lg">
      <h2>
        <i className="ph ph-warning-circle ic-primary" /> No account found
      </h2>
      <p className="sub" style={{ margin: "0 0 16px" }}>
        {state === "not_found"
          ? "That Google account isn't linked to a Smart Savor account yet — if this is your first time, use the invite code your dietitian gave you."
          : "Something went wrong signing you in — try again in a moment."}
      </p>
      <Link href="/invite" className="btn primary">
        Enter invite code
      </Link>
    </div>
  );
}
