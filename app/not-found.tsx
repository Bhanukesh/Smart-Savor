// Covers both a bad URL and every existing notFound() call (e.g. an invalid patient id) —
// same treatment as error.tsx, but for "this doesn't exist" rather than "something broke."
export default function NotFound() {
  return (
    <main className="wrap narrow">
      <div className="card pad-lg" style={{ textAlign: "center" }}>
        <i className="ph ph-map-trifold ic-primary" style={{ fontSize: 40 }} />
        <h1 style={{ marginTop: 12 }}>Can&apos;t find that</h1>
        <p className="sub" style={{ margin: "0 auto 20px", maxWidth: "40ch" }}>
          This page, or whatever it&apos;s pointing at, doesn&apos;t exist — the link might be
          old, or the record may have been removed.
        </p>
        <a className="btn primary" href="/">
          <i className="ph-bold ph-arrow-left" /> Back to start
        </a>
      </div>
    </main>
  );
}
