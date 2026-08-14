import Topbar from "@/components/Topbar";
import ReturningPatientSignIn from "@/components/ReturningPatientSignIn";

export const dynamic = "force-dynamic";

export default function WelcomeBackPage() {
  return (
    <>
      <Topbar />
      <main className="wrap narrow">
        <p className="eyebrow">Welcome back</p>
        <h1>
          One <em>moment</em>
        </h1>
        <ReturningPatientSignIn />
      </main>
    </>
  );
}
