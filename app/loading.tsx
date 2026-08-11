// Shown automatically by Next while a server-rendered page's data fetch is in flight — same
// spin treatment already used for the Coach's "thinking…" state (components/CoachChat.tsx).
export default function Loading() {
  return (
    <main className="wrap" style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
      <i
        className="ph ph-circle-notch ic-primary"
        style={{ fontSize: 32, animation: "spin 1s linear infinite" }}
      />
    </main>
  );
}
