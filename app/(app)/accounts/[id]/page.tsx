import Link from "next/link";
import { notFound } from "next/navigation";
import { Kpi } from "@/components/Kpi";
import { money, shortDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AccountHistory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) notFound();
  const entries = await prisma.transaction.findMany({
    where: { OR: [{ accountId: id }, { destinationAccountId: id }] },
    include: { account: true, destinationAccount: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return <>
    <div className="pageHead"><div><p className="eyebrow">Account history</p><h1>{account.name}</h1><p>{account.kind.replaceAll("_", " ")} · {account.active ? "Active" : "Archived"}</p></div><Link className="btn" href="/accounts">← Accounts</Link></div>
    <div className="kpiGrid small"><Kpi label="Current balance" value={money(Number(account.balance))} note={`${entries.length} linked transactions`} tone="blue" /></div>
    <section className="panel">{entries.length ? <div className="tableWrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Movement</th><th>Note</th><th className="num">Amount</th></tr></thead><tbody>{entries.map(entry => {
      const incoming = entry.type === "INCOME" || (entry.type === "TRANSFER" && entry.destinationAccountId === id);
      const movement = entry.type === "TRANSFER" ? `${entry.account?.name || "—"} → ${entry.destinationAccount?.name || "—"}` : entry.account?.name || "—";
      return <tr key={entry.id}><td>{shortDate(entry.date)}</td><td><span className={`pill ${entry.type.toLowerCase()}`}>{entry.type}</span></td><td>{entry.category}</td><td>{movement}</td><td className="muted">{entry.note || "—"}</td><td className={`num ${incoming ? "positive" : "negative"}`}><b>{incoming ? "+" : "−"}{money(Number(entry.amount))}</b></td></tr>;
    })}</tbody></table></div> : <div className="emptyState"><h3>No transaction history</h3><p>This account only has its opening or manually reconciled balance.</p></div>}</section>
  </>;
}
