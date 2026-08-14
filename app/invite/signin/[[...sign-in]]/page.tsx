import { SignIn } from "@clerk/nextjs";
import Topbar from "@/components/Topbar";

export const dynamic = "force-dynamic";

// Returning-patient sign-in — no invite code needed. Same patient Clerk app as
// app/invite/signup (unrestricted; the invite code is the real gate on account *creation*,
// not this), but redirects to /invite/welcome-back instead of /invite/claim, since there's no
// code to redeem here — welcome-back looks the resulting Clerk identity up against an existing
// account instead (see lib/invite.ts's signInReturningPatient()).
export default function InviteSignInPage() {
  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        <p className="eyebrow">Welcome back</p>
        <h1>
          Sign in to <em>Smart Savor</em>
        </h1>
        <p className="sub">Use the same Google account you signed up with.</p>
        <SignIn
          path="/invite/signin"
          routing="path"
          signUpUrl="/invite/signin"
          fallbackRedirectUrl="/invite/welcome-back"
        />
      </main>
    </>
  );
}
