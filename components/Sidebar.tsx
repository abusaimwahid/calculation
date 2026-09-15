import Link from "next/link";
import { logoutAction } from "@/app/actions";

const links = [
  ["Dashboard", "/dashboard", "⌂"],
  ["Transactions", "/transactions", "↕"],
  ["Accounts", "/accounts", "◫"],
  ["Assets", "/assets", "◇"],
  ["Debts", "/debts", "⇄"],
  ["Crypto", "/crypto", "₿"],
  ["Backup", "/backup", "↓"],
  ["Settings", "/settings", "⚙"],
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brandMark">L</span><div><b>LifeLedger</b><small>Personal finance</small></div></div>
      <nav>{links.map(([label, href, icon]) => <Link key={href} href={href}><span>{icon}</span>{label}</Link>)}</nav>
      <form action={logoutAction}><button className="navLogout" type="submit">Sign out</button></form>
    </aside>
  );
}
