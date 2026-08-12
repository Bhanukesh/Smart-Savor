import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

/** Glass sticky top bar. `context` = the small label next to the wordmark; `who` = signed-in
 * line; `showAccountMenu` = dietitian-console pages only (Clerk-managed account/sign-out —
 * patients have no equivalent, they're not on Clerk at all). */
export default function Topbar({
  context,
  who,
  showAccountMenu,
}: {
  context?: string;
  who?: React.ReactNode;
  showAccountMenu?: boolean;
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
      <div className="who">
        {who}
        {showAccountMenu && <UserButton />}
      </div>
    </div>
  );
}
