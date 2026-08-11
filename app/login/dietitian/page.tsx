import Topbar from "@/components/Topbar";
import DietitianLoginForm from "@/components/DietitianLoginForm";

export const dynamic = "force-dynamic";

export default function DietitianLoginPage() {
  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        <p className="eyebrow">Dietitian console</p>
        <h1>
          Sign in to <em>Smart Savor</em>
        </h1>
        <p className="sub">Your patients&apos; plans, one place.</p>
        <DietitianLoginForm />
      </main>
    </>
  );
}
