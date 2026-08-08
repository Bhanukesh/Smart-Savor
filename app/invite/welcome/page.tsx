import Link from "next/link";
import Topbar from "@/components/Topbar";

export const dynamic = "force-dynamic";

export default async function InviteWelcomePage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name } = await searchParams;

  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        <div className="card pad-lg" style={{ textAlign: "center" }}>
          <i className="ph-fill ph-seal-check ic-success" style={{ fontSize: 40 }} />
          <h1 style={{ marginTop: 12 }}>You&apos;re in{name ? `, ${name}` : ""}</h1>
          <p className="sub" style={{ margin: "0 auto 20px", maxWidth: "40ch" }}>
            Your account is active — here&apos;s your plan.
          </p>
          <Link href="/me/dashboard" className="btn primary">
            Continue to your plan <i className="ph-bold ph-arrow-right" />
          </Link>
        </div>
      </main>
    </>
  );
}
