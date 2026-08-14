"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Local sub-nav scoped to one patient — everything about them (Overview, Focus Set, Swap
 * Menu, Messages) lives here instead of as global dietitian-console tabs. */
export default function PatientLocalNav({ patientId, patientName }: { patientId: string; patientName: string }) {
  const path = usePathname();
  const base = `/patients/${patientId}`;
  const links = [
    { href: base, label: "Overview", icon: "ph-identification-badge" },
    { href: `${base}/prioritize`, label: "Focus Set", icon: "ph-list-numbers" },
    { href: `${base}/ratify`, label: "Swap Menu", icon: "ph-check-square" },
    { href: `${base}/food-log`, label: "Food Log", icon: "ph-fork-knife" },
    { href: `${base}/messages`, label: "Messages", icon: "ph-chat-circle-dots" },
  ];

  return (
    <div style={{ margin: "18px 0 8px" }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <i className="ph ph-user ic-primary" /> {patientName}
      </div>
      <nav className="protonav" aria-label="Patient sections">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? "here" : ""}>
            <i className={`ph ${l.icon}`} />
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
