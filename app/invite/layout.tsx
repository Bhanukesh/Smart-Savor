import { ClerkProvider } from "@clerk/nextjs";
import { PATIENT_CLERK_PUBLISHABLE_KEY } from "@/lib/patientClerk";

// The patient Clerk app, scoped to this route group only — sibling to app/(dietitian)/layout.tsx,
// not nested inside it (root layout has no ClerkProvider of its own; see its comment for why
// nesting two ClerkProviders doesn't actually override like React context normally would).
// Matches proxy.ts's key resolver, which already routes /invite/* and /api/invite/* requests
// to the patient app server-side.
export default function InviteLayout({ children }: { children: React.ReactNode }) {
  if (!PATIENT_CLERK_PUBLISHABLE_KEY) return <>{children}</>;
  return <ClerkProvider publishableKey={PATIENT_CLERK_PUBLISHABLE_KEY}>{children}</ClerkProvider>;
}
