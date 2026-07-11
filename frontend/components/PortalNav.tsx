"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/rx/prioritize", label: "Prioritize", icon: "ph-list-numbers" },
  { href: "/rx/ratify", label: "Ratify", icon: "ph-check-square" },
  { href: "/me/swap", label: "Swap", icon: "ph-star" },
  { href: "/me/dashboard", label: "Dashboard", icon: "ph-chart-line" },
];

/** Pill nav linking the four live screens, mirroring the prototype's stepper. */
export default function PortalNav() {
  const path = usePathname();
  return (
    <nav className="protonav" aria-label="Stages" style={{ margin: "18px 0 8px" }}>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "here" : ""}>
          <i className={`ph ${l.icon}`} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
