import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import Topbar from "@/components/Topbar";
import { checkInviteCode } from "@/lib/invite";

export const dynamic = "force-dynamic";

// Google sign-in through the separate, unrestricted patient Clerk app (app/invite/layout.tsx
// nests a second ClerkProvider here, scoped by proxy.ts's key resolver) — the invite code
// re-checked here is still the real gate; Clerk itself doesn't restrict who can sign in.
export default async function InviteSignupPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const check = code ? await checkInviteCode(code) : ({ valid: false } as const);

  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        {check.valid ? (
          <>
            <p className="eyebrow">Sign up</p>
            <h1>
              You&apos;re invited, <em>{check.patientFirstName}</em>
            </h1>
            <p className="sub">Issued by {check.issuedByDietitianName}.</p>
            <SignIn
              path="/invite/signup"
              routing="path"
              signUpUrl="/invite/signup"
              fallbackRedirectUrl={`/invite/claim?code=${encodeURIComponent(code as string)}`}
            />
          </>
        ) : (
          <div className="card pad-lg">
            <h2>
              <i className="ph ph-warning-circle ic-primary" /> That code didn&apos;t work
            </h2>
            <p className="sub" style={{ margin: "0 0 16px" }}>
              It may be expired or already used. Ask your dietitian to resend a fresh one.
            </p>
            <Link href="/invite" className="btn primary">
              Try another code
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
