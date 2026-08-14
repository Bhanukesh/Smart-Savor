import Link from "next/link";
import Topbar from "@/components/Topbar";
import InviteCodeForm from "@/components/InviteCodeForm";

export const dynamic = "force-dynamic";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;

  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        <p className="eyebrow">Welcome</p>
        <h1>
          Welcome to <em>Smart Savor</em>
        </h1>
        <p className="sub">
          There&apos;s no public sign-up — every account starts with a one-time code from your
          dietitian.
        </p>
        <InviteCodeForm initialCode={code} />
        <p className="sub" style={{ textAlign: "center", marginTop: 16 }}>
          Already signed up? <Link href="/invite/signin">Sign in</Link>
        </p>
      </main>
    </>
  );
}
