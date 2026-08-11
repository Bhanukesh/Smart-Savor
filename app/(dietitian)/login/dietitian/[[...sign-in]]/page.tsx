import { SignIn } from "@clerk/nextjs";
import Topbar from "@/components/Topbar";

export const dynamic = "force-dynamic";

// Clerk-hosted sign-in (Restricted mode — only invited emails can complete it; see
// lib/auth/dietitian.ts). Social-only (Google/Microsoft), so there's no separate "sign up"
// step to distinguish from "sign in" here — the same component handles both.
export default async function DietitianLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const redirectTo = returnTo && returnTo.startsWith("/") ? returnTo : "/";

  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        <p className="eyebrow">Dietitian console</p>
        <h1>
          Sign in to <em>Smart Savor</em>
        </h1>
        <p className="sub">Your patients&apos; plans, one place.</p>
        <SignIn
          path="/login/dietitian"
          routing="path"
          signUpUrl="/login/dietitian"
          fallbackRedirectUrl={redirectTo}
        />
      </main>
    </>
  );
}
