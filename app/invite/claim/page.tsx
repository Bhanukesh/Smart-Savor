import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import Topbar from "@/components/Topbar";
import ConfirmDetailsForm from "@/components/ConfirmDetailsForm";
import { checkInviteCode } from "@/lib/invite";
import { getPatientClerkClient } from "@/lib/patientClerk";

export const dynamic = "force-dynamic";

// Lands here straight from Clerk's sign-in (app/invite/signup) — auth() here reflects the
// *patient* Clerk app (proxy.ts's key resolver routes /api/invite/* and /invite/* there), so
// this is already a real, verified Google identity by the time this page renders. Just
// confirms name (pre-filled from Google when available) and age before actually redeeming.
export default async function InviteClaimPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const check = code ? await checkInviteCode(code) : ({ valid: false } as const);
  const { userId } = await auth();

  let firstName = "";
  let lastName = "";
  if (userId) {
    const client = getPatientClerkClient();
    if (client) {
      const clerkUser = await client.users.getUser(userId);
      firstName = clerkUser.firstName ?? "";
      lastName = clerkUser.lastName ?? "";
    }
  }

  const ready = check.valid && code && userId;

  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        {ready ? (
          <>
            <p className="eyebrow">Sign up</p>
            <h1>
              Almost there, <em>{check.valid ? check.patientFirstName : ""}</em>
            </h1>
            <p className="sub">Just confirm a couple details to finish.</p>
            <ConfirmDetailsForm code={code as string} initialFirstName={firstName} initialLastName={lastName} />
          </>
        ) : (
          <div className="card pad-lg">
            <h2>
              <i className="ph ph-warning-circle ic-primary" /> Something didn&apos;t line up
            </h2>
            <p className="sub" style={{ margin: "0 0 16px" }}>
              Either the invite code or the sign-in didn&apos;t go through — start again from
              your invite link.
            </p>
            <Link href={code ? `/invite/signup?code=${encodeURIComponent(code)}` : "/invite"} className="btn primary">
              Try again
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
