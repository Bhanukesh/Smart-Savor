import { ClerkProvider } from "@clerk/nextjs";

// Scoped to this route group (/, /patients/**, /team, /login/dietitian/**) — the dietitian
// Clerk app, default env vars (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY). The
// patient Clerk app is a completely separate instance, scoped to app/invite/layout.tsx —
// never both active on the same page tree. See app/layout.tsx's comment for why this can't
// just be one shared ClerkProvider at the root.
export default function DietitianLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider afterSignOutUrl="/login/dietitian">{children}</ClerkProvider>;
}
