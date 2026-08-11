"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Two separate interfaces, not one shared surface: the dietitian's web console (root /*) and
// the patient's app (/me/*). A dietitian never sees patient-side screens in their nav, and
// vice versa — matches how the two would actually be deployed (console vs. mobile app).
// The console itself is patient-centric, not workflow-tab-centric: Focus Set / Swap Menu /
// Messages live under each patient's own profile (PatientLocalNav), not as global tabs here.
const RX_LINKS = [
  { href: "/", label: "Patients", icon: "ph-users-three" },
];

const ME_LINKS = [
  { href: "/me/swap", label: "Swap", icon: "ph-star" },
  { href: "/me/log", label: "Log", icon: "ph-fork-knife" },
  { href: "/me/receipts", label: "Receipts", icon: "ph-receipt" },
  { href: "/me/labs", label: "Labs", icon: "ph-flask" },
  { href: "/me/dashboard", label: "Dashboard", icon: "ph-chart-line" },
  { href: "/me/history", label: "History", icon: "ph-clock-counter-clockwise" },
  { href: "/me/profile", label: "Profile", icon: "ph-user-circle" },
  { href: "/me/messages", label: "Messages", icon: "ph-envelope-simple" },
  { href: "/me/coach", label: "Coach", icon: "ph-chat-circle-dots" },
];

type OnboardingStatus = { hasLabReports: boolean; hasReceipts: boolean };

/** Pill nav linking the live screens, mirroring the prototype's stepper. Scoped to whichever
 * side (root dietitian console or /me patient app) the current page belongs to. */
export default function PortalNav() {
  const path = usePathname();
  const isPatientSide = path.startsWith("/me");
  const links = isPatientSide ? ME_LINKS : RX_LINKS;
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  // First-onboarding nudge: labs is the mandatory ask, so it pulses until at least one exists;
  // receipts is optional, so it only gets a plain dot (present vs. done, not urgency).
  useEffect(() => {
    if (!isPatientSide) return;
    let cancelled = false;
    fetch("/api/me/onboarding-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OnboardingStatus | null) => {
        if (!cancelled && data) setOnboarding(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isPatientSide]);

  return (
    <nav className="protonav" aria-label="Stages" style={{ margin: "18px 0 8px" }}>
      {links.map((l) => {
        const showPulseBadge = onboarding && l.href === "/me/labs" && !onboarding.hasLabReports;
        const showDotBadge = onboarding && l.href === "/me/receipts" && !onboarding.hasReceipts;
        return (
          <Link key={l.href} href={l.href} className={path === l.href ? "here" : ""} style={{ position: "relative" }}>
            <i className={`ph ${l.icon}`} />
            {l.label}
            {showPulseBadge && <span className="nav-badge pulse" aria-label="Lab report needed" />}
            {showDotBadge && <span className="nav-badge" aria-label="Receipts optional" />}
          </Link>
        );
      })}
    </nav>
  );
}
