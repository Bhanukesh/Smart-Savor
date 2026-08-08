import Link from "next/link";
import Topbar from "@/components/Topbar";
import IdentityForm from "@/components/IdentityForm";
import { checkInviteCode } from "@/lib/invite";

export const dynamic = "force-dynamic";

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
            <p className="sub">Issued by {check.issuedByDietitianName} — just a couple details to finish.</p>
            <IdentityForm code={code as string} />
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
