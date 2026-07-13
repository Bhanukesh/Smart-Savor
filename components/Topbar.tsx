import Link from "next/link";

/** Glass sticky top bar. `context` = the small label next to the wordmark; `who` = signed-in line. */
export default function Topbar({
  context,
  who,
}: {
  context?: string;
  who?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <Link href="/" className="brand">
        <span className="mark">
          <i className="ph-fill ph-leaf" />
        </span>
        Smart&nbsp;Savor
        {context ? <small>{context}</small> : null}
      </Link>
      <div className="who">{who}</div>
    </div>
  );
}
