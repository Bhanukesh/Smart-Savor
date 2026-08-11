import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Savor",
  description:
    "An adherence-and-outcomes tool for dietitians. Your doctor tells your body what it needs — you decide what's on your plate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/login/dietitian">
      <html lang="en">
        <head>
          {/* Phosphor icons — self-hosted from /public/phosphor (no CDN). regular / bold / fill. */}
          <link rel="stylesheet" href="/phosphor/regular/style.css" />
          <link rel="stylesheet" href="/phosphor/bold/style.css" />
          <link rel="stylesheet" href="/phosphor/fill/style.css" />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
