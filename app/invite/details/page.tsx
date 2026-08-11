import Link from "next/link";
import Topbar from "@/components/Topbar";
import ConfirmDetailsForm from "@/components/ConfirmDetailsForm";
import { checkInviteCode } from "@/lib/invite";
import { getPendingIdentity } from "@/lib/invitePendingIdentity";

export const dynamic = "force-dynamic";

// The step after Google or phone/OTP verification (see app/api/invite/google/callback,
// app/api/invite/phone/verify-otp) — identity is already real by the time anyone lands here;
// this just confirms name (pre-filled from Google when available) and age (never pre-filled,
// always required — see app/api/invite/finish for why it overrides the dietitian's estimate).
export default async function InviteDetailsPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const check = code ? await checkInviteCode(code) : ({ valid: false } as const);
  const pending = await getPendingIdentity();
  const ready = check.valid && code && pending && pending.inviteCode === code;

  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        {ready ? (
          <>
            <p className="eyebrow">Sign up</p>
            <h1>
              Almost there, <em>{check.patientFirstName}</em>
            </h1>
            <p className="sub">Just confirm a couple details to finish.</p>
            <ConfirmDetailsForm
              code={code as string}
              initialFirstName={pending.provider === "google" ? pending.firstName ?? "" : ""}
              initialLastName={pending.provider === "google" ? pending.lastName ?? "" : ""}
            />
          </>
        ) : (
          <div className="card pad-lg">
            <h2>
              <i className="ph ph-warning-circle ic-primary" /> That link expired
            </h2>
            <p className="sub" style={{ margin: "0 0 16px" }}>
              Verification only stays valid for a few minutes — start again from your invite code.
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
