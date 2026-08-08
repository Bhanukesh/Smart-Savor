"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

/** Pill nav linking the live screens, mirroring the prototype's stepper. Scoped to whichever
 * side (root dietitian console or /me patient app) the current page belongs to. */
export default function PortalNav() {
  const path = usePathname();
  const links = path.startsWith("/me") ? ME_LINKS : RX_LINKS;
  return (
    <nav className="protonav" aria-label="Stages" style={{ margin: "18px 0 8px" }}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "here" : ""}>
          <i className={`ph ${l.icon}`} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
