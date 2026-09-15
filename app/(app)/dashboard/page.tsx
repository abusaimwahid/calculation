import Link from "next/link";
import { Kpi } from "@/components/Kpi";
import { calculateNetWorth } from "@/lib/finance";
import { bdNow, money, number, shortDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function monthKey(d: Date) { return d.toISOString().slice(0, 7); }
function monthLabel(key: string) { const [y, m] = key.split("-"); return new Intl.DateTimeFormat("en", { month: "short", year: "2-digit" }).format(new Date(Date.UTC(Number(y), Number(m)-1, 1))); }

export default async function Dashboard() {
  const [tx, accounts, assets, debts, holdings, flows, settings] = await Promise.all([
    prisma.transaction.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }], include: { account: true, destinationAccount: true } }),
    prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.asset.findMany(),
    prisma.debt.findMany(),
    prisma.cryptoHolding.findMany(),
    prisma.cryptoFlow.findMany(),
    prisma.setting.findMany(),
  ]);
  const set = Object.fromEntries(settings.map(s => [s.key, Number(s.value)]));
  const rate = set.exchangeRate || 127;
  const availableUsdt = set.availableUsdt || 0;
  const cash = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const assetsTotal = assets.filter(a => a.includeInNetWorth).reduce((s, a) => s + Number(a.currentValue ?? a.purchaseValue), 0);
  const payable = debts.filter(d => d.direction === "PAYABLE" && d.status !== "PAID").reduce((s, d) => s + Number(d.remainingAmount), 0);
  const receivable = debts.filter(d => d.direction === "RECEIVABLE" && d.status !== "PAID").reduce((s, d) => s + Number(d.remainingAmount), 0);
  const holdingValueUsdt = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.currentPriceUsdt), 0);
  const costUsdt = holdings.reduce((s, h) => s + Number(h.costUsdt), 0);
  const cryptoBdt = (availableUsdt + holdingValueUsdt) * rate;
  const portfolioPL = holdingValueUsdt - costUsdt;
  const netWorth = calculateNetWorth({ accounts: cash, assets: assetsTotal, receivables: receivable, crypto: cryptoBdt, payables: payable });
  const income = tx.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  const now = bdNow();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthIncome = tx.filter(t => t.date && monthKey(t.date) === currentMonth && t.type === "INCOME").reduce((s,t)=>s+Number(t.amount),0);
  const monthExpense = tx.filter(t => t.date && monthKey(t.date) === currentMonth && t.type === "EXPENSE").reduce((s,t)=>s+Number(t.amount),0);

  const monthKeys = Array.from({ length: 6 }, (_, i) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-5+i, 1)); return monthKey(d); });
  const monthly = monthKeys.map(key => ({ key, income: tx.filter(t=>t.date && monthKey(t.date)===key && t.type==="INCOME").reduce((s,t)=>s+Number(t.amount),0), expense: tx.filter(t=>t.date && monthKey(t.date)===key && t.type==="EXPENSE").reduce((s,t)=>s+Number(t.amount),0) }));
  const maxMonthly = Math.max(1, ...monthly.flatMap(m => [m.income, m.expense]));

  const cats = new Map<string, number>();
  tx.filter(t=>t.type==="EXPENSE").forEach(t=>cats.set(t.category,(cats.get(t.category)||0)+Number(t.amount)));
  const topCats = [...cats.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCat = Math.max(1, ...topCats.map(x=>x[1]));

  const capitalIn = flows.filter(f=>f.type==="BUY" || f.type==="DEPOSIT").reduce((s,f)=>s+Number(f.amountUsdt),0);
  const capitalOut = flows.filter(f=>f.type==="SELL" || f.type==="WITHDRAW").reduce((s,f)=>s+Number(f.amountUsdt),0);

  return <>
    <div className="pageHead"><div><p className="eyebrow">Overview</p><h1>Finance dashboard</h1><p>Your daily money, assets, debts and crypto in one place.</p></div><Link className="btn primary" href="/transactions#new">+ Add transaction</Link></div>
    <section className="kpiGrid">
      <Kpi label="Net worth" value={money(netWorth)} note="Cash + assets + crypto + receivables − payables" tone="blue" />
      <Kpi label="This month income" value={money(monthIncome)} note="Dated income transactions" tone="good" />
      <Kpi label="This month expenses" value={money(monthExpense)} note="Dated expense transactions" tone={monthExpense > monthIncome && monthIncome > 0 ? "bad" : "default"} />
      <Kpi label="Monthly balance" value={money(monthIncome-monthExpense)} note="Income − expenses" tone={monthIncome-monthExpense >= 0 ? "good" : "bad"} />
      <Kpi label="Cash & wallets" value={money(cash)} note={`${accounts.length} active accounts`} />
      <Kpi label="Crypto value" value={money(cryptoBdt)} note={`${number(availableUsdt + holdingValueUsdt, 2)} USDT @ ৳${number(rate,2)}`} />
      <Kpi label="Available USDT" value={`${number(availableUsdt, 2)} USDT`} note={money(availableUsdt*rate)} />
      <Kpi label="Assets" value={money(assetsTotal)} note={`${assets.filter(a=>a.includeInNetWorth).length} included items`} />
      <Kpi label="Payable debts" value={money(payable)} note="Remaining money you owe" tone={payable > 0 ? "bad" : "good"} />
      <Kpi label="Receivable debts" value={money(receivable)} note="Remaining money owed to you" tone="good" />
    </section>

    <div className="twoCol">
      <section className="panel"><div className="panelHead"><div><h2>Last 6 months</h2><p>Income vs expense</p></div></div>
        <div className="chartBars">{monthly.map(m=><div className="monthBar" key={m.key}><div className="barArea"><i className="bar income" style={{height:`${Math.max(3,m.income/maxMonthly*100)}%`}} title={`Income ${money(m.income)}`} /><i className="bar expense" style={{height:`${Math.max(3,m.expense/maxMonthly*100)}%`}} title={`Expense ${money(m.expense)}`} /></div><small>{monthLabel(m.key)}</small></div>)}</div>
        <div className="legend"><span><i className="dot incomeDot"/>Income</span><span><i className="dot expenseDot"/>Expense</span></div>
      </section>
      <section className="panel"><div className="panelHead"><div><h2>Top expense categories</h2><p>Lifetime records</p></div></div>
        <div className="categoryList">{topCats.length ? topCats.map(([name,val])=><div key={name}><div className="row"><span>{name}</span><b>{money(val)}</b></div><div className="progress"><i style={{width:`${val/maxCat*100}%`}}/></div></div>) : <p className="muted">No expense records yet.</p>}</div>
      </section>
    </div>

    <div className="twoCol">
      <section className="panel"><div className="panelHead"><div><h2>Recent transactions</h2><p>Latest daily records</p></div><Link href="/transactions">View all</Link></div>
        <div className="compactList">{tx.slice(0,7).map(t=><div key={t.id} className="compactRow"><div><b>{t.category}</b><small>{shortDate(t.date)}{t.type === "TRANSFER" ? ` · ${t.account?.name || "—"} → ${t.destinationAccount?.name || "—"}` : ""}{t.note ? ` · ${t.note}` : ""}</small></div><strong className={t.type === "INCOME" ? "positive" : t.type === "EXPENSE" ? "negative" : ""}>{t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}{money(Number(t.amount))}</strong></div>)}</div>
      </section>
      <section className="panel"><div className="panelHead"><div><h2>Crypto snapshot</h2><p>Mapped from your Excel logic</p></div><Link href="/crypto">Manage</Link></div>
        <div className="summaryRows"><div><span>Total capital in</span><b>{number(capitalIn)} USDT</b></div><div><span>Total capital out</span><b>{number(capitalOut)} USDT</b></div><div><span>Net USDT capital</span><b>{number(capitalIn-capitalOut)} USDT</b></div><div><span>Portfolio P/L</span><b className={portfolioPL >= 0 ? "positive":"negative"}>{number(portfolioPL)} USDT</b></div><div><span>Lifetime income / expense</span><b>{money(income)} / {money(expense)}</b></div></div>
      </section>
    </div>
  </>;
}
