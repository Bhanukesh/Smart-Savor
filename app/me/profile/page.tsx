import Link from "next/link";
import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import PreferencesForm from "@/components/PreferencesForm";
import WeightCheckInForm from "@/components/WeightCheckInForm";
import { getSessionPatient, getWeightCheckIns } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const patient = await getSessionPatient();
  if (!patient) notFound();
  const checkIns = await getWeightCheckIns(patient.id, 4);

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Profile"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Profile &amp; Account</p>
        <h1>
          Your <em>account</em>, {patient.name.split(" ")[0]}
        </h1>

        <div className="card pad-lg" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: "50%", background: "var(--primary-tint)",
              display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
            }}
          >
            <i className="ph ph-user ic-primary" style={{ fontSize: 22 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{patient.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>
              {patient.enrolledAt
                ? `Patient since ${new Date(patient.enrolledAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
                : "Patient"}
            </div>
          </div>
        </div>

        <PreferencesForm patientId={patient.id} patient={patient} />
        <WeightCheckInForm patientId={patient.id} initialCheckIns={checkIns} />

        <div className="card pad-lg">
          <h2>
            <i className="ph ph-chat-circle-dots ic-primary" /> Messages
          </h2>
          <p className="sub" style={{ margin: "0 0 10px" }}>
            A private, secure thread with {patient.dietitianName.split(",")[0]}.
          </p>
          <Link href="/me/messages" className="btn">
            <i className="ph-bold ph-arrow-right" /> Open messages
          </Link>
        </div>

        <p className="note honesty">
          <strong>
            <i className="ph ph-eye ic-primary" /> Honest note:
          </strong>{" "}
          your account exists because {patient.dietitianName.split(",")[0]}
          {" "}added you — there&apos;s no separate public sign-up for patients.
        </p>

        <Link href="/" className="btn" style={{ color: "var(--danger)", marginTop: 4 }}>
          <i className="ph-bold ph-sign-out" /> Log out
        </Link>
      </main>
    </>
  );
}
