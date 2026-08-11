"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DietitianLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't log in.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card pad-lg">
      <h2>
        <i className="ph ph-stethoscope ic-primary" /> Dietitian sign in
      </h2>
      <p className="sub" style={{ margin: "0 0 16px" }}>
        Your practice email and password.
      </p>
      <div className="field-row">
        <label className="field-label" htmlFor="email">Email</label>
        <input
          id="email" type="email" className="field" autoComplete="username"
          value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
        />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor="password">Password</label>
        <div className="field-with-toggle">
          <input
            id="password" type={showPassword ? "text" : "password"} className="field" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button" className="field-toggle-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            tabIndex={-1}
          >
            <i className={showPassword ? "ph ph-eye-slash" : "ph ph-eye"} />
          </button>
        </div>
      </div>

      {error && (
        <p className="note" style={{ marginTop: 4 }}>
          <i className="ph ph-warning-circle ic-primary" /> {error}
        </p>
      )}

      <button
        className="btn primary" type="submit" style={{ width: "100%", marginTop: 6 }}
        disabled={submitting || !email.trim() || !password}
      >
        {submitting ? "Signing in…" : "Sign in"} <i className="ph-bold ph-arrow-right" />
      </button>
    </form>
  );
}
