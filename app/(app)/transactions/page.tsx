import Link from "next/link";
import { createTransaction, deleteTransaction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { bdToday, money, shortDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const expenseCats = ["Food", "Transport", "Shopping", "Family", "Bills", "Health", "Education", "Travel", "Subscriptions", "Personal", "Other"];
const incomeCats = ["Salary", "Freelance", "Business", "Bonus", "Refund", "Gift", "Other"];

export default async function Transactions({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "" } = await searchParams;
  const [accounts, tx] = await Promise.all([
    prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where: {
        ...(type === "INCOME" || type === "EXPENSE" ? { type } : {}),
        ...(q ? { OR: [{ category: { contains: q, mode: "insensitive" } }, { note: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { account: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 250,
    }),
  ]);
  return <>
    <div className="pageHead"><div><p className="eyebrow">Daily records</p><h1>Transactions</h1><p>Add income and expenses in seconds. Your dashboard updates automatically.</p></div></div>
    <section className="panel" id="new"><div className="panelHead"><div><h2>Quick add</h2><p>One row for each real-life transaction. Selecting an account automatically updates its balance.</p></div></div>
      <form action={createTransaction} className="formGrid txForm">
        <label>Type<select name="type" defaultValue="EXPENSE"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label>
        <label>Date<input name="date" type="date" defaultValue={bdToday()} required /></label>
        <label>Amount (BDT)<input name="amount" type="number" min="0.01" step="0.01" placeholder="0" required /></label>
        <label>Account<select name="accountId" defaultValue=""><option value="">Not specified</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Category<input name="category" list="categories" placeholder="Food / Salary / etc." required /><datalist id="categories">{[...expenseCats,...incomeCats].map((c,i)=><option key={`${c}-${i}`} value={c}/>)}</datalist></label>
        <label className="wide">Note<input name="note" placeholder="Optional details" /></label>
        <div className="formActions wide"><SubmitButton>Add transaction</SubmitButton></div>
      </form>
    </section>

    <section className="panel"><div className="panelHead"><div><h2>History</h2><p>{tx.length} matching records</p></div><form className="filters"><input name="q" defaultValue={q} placeholder="Search note/category"/><select name="type" defaultValue={type}><option value="">All</option><option value="EXPENSE">Expenses</option><option value="INCOME">Income</option></select><button className="btn" type="submit">Filter</button></form></div>
      <div className="tableWrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th>Note</th><th className="num">Amount</th><th></th></tr></thead><tbody>{tx.map(t=><tr key={t.id}><td>{shortDate(t.date)}</td><td><span className={`pill ${t.type.toLowerCase()}`}>{t.type}</span></td><td><b>{t.category}</b></td><td>{t.account?.name || "—"}</td><td className="muted">{t.note || (t.legacy ? "Imported from Excel" : "—")}</td><td className={`num ${t.type === "INCOME" ? "positive":"negative"}`}><b>{t.type === "INCOME" ? "+":"−"}{money(Number(t.amount))}</b></td><td><div className="actions"><Link className="miniBtn" href={`/transactions/${t.id}`}>Edit</Link><form action={deleteTransaction}><input type="hidden" name="id" value={t.id}/><button className="miniBtn danger" type="submit">Delete</button></form></div></td></tr>)}</tbody></table></div>
    </section>
  </>;
}
