import Topbar from "@/components/Topbar";
import { SignOutButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

// Reached when proxy.ts finds a valid Clerk session with no linked Dietitian/User row —
// Restricted mode should make this rare (only invited emails can even create a Clerk account),
// but an invite that was never turned into a seat (bootstrap email typo, a webhook that hasn't
// run yet) lands here instead of silently getting in.
export default function NoAccessPage() {
  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        <p className="eyebrow">Dietitian console</p>
        <h1>
          No account <em>linked</em>
        </h1>
        <p className="sub">
          You&apos;re signed in, but this email isn&apos;t linked to a dietitian account on Smart
          Savor. If you were invited, ask whoever sent the invite to double-check the email
          address — sign-in only works for the exact email an invite (or your practice&apos;s
          setup) was issued to.
        </p>
        <SignOutButton>
          <button className="btn">Sign out and try a different account</button>
        </SignOutButton>
      </main>
    </>
  );
}
