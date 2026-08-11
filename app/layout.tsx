import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Savor",
  description:
    "An adherence-and-outcomes tool for dietitians. Your doctor tells your body what it needs — you decide what's on your plate.",
};

// No ClerkProvider here on purpose — two separate Clerk apps exist (dietitian, patient; see
// CLAUDE.md), each scoped to its own route group's layout (app/(dietitian)/layout.tsx,
// app/invite/layout.tsx). A single root-level ClerkProvider can only ever point at one app;
// nesting a second one inside it does NOT override it — Clerk's client SDK loads a singleton
// script tied to whichever provider mounts first, confirmed by checking which Frontend API
// domain actually loaded in the browser, not just assumed.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Phosphor icons — self-hosted from /public/phosphor (no CDN). regular / bold / fill. */}
        <link rel="stylesheet" href="/phosphor/regular/style.css" />
        <link rel="stylesheet" href="/phosphor/bold/style.css" />
        <link rel="stylesheet" href="/phosphor/fill/style.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
