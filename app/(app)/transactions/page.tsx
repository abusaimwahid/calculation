import { Prisma, TransactionType } from "@prisma/client";
import Link from "next/link";
import { createTransaction, deleteTransaction } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SubmitButton } from "@/components/SubmitButton";
import { bdToday, money, shortDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const categories = ["Food", "Transport", "Shopping", "Family", "Bills", "Health", "Education", "Entertainment", "Business", "Personal", "Travel", "Salary", "Freelance", "Investment", "Other"];
const sortOptions = {
  newest: [{ date: "desc" }, { createdAt: "desc" }],
  oldest: [{ date: "asc" }, { createdAt: "asc" }],
  amountHigh: [{ amount: "desc" }, { date: "desc" }],
  amountLow: [{ amount: "asc" }, { date: "desc" }],
} satisfies Record<string, Prisma.TransactionOrderByWithRelationInput[]>;

type Params = { q?: string; type?: string; account?: string; category?: string; sort?: string };

export default async function Transactions({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", type = "", account = "", category = "", sort = "newest" } = await searchParams;
  const selectedType = Object.values(TransactionType).includes(type as TransactionType) ? type as TransactionType : undefined;
  const orderBy = sortOptions[sort as keyof typeof sortOptions] ?? sortOptions.newest;
  const [accounts, categoryRows, tx] = await Promise.all([
    prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    prisma.transaction.findMany({
      where: {
        ...(selectedType ? { type: selectedType } : {}),
        ...(account ? { OR: [{ accountId: account }, { destinationAccountId: account }] } : {}),
        ...(category ? { category } : {}),
        ...(q ? { OR: [{ category: { contains: q, mode: "insensitive" } }, { note: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { account: true, destinationAccount: true },
      orderBy,
      take: 500,
    }),
  ]);

  return <>
    <div className="pageHead"><div><p className="eyebrow">Daily records</p><h1>Transactions</h1><p>Add, find, and correct daily money movements.</p></div><a className="btn primary mobileAdd" href="#new">+ Add transaction</a></div>
    <section className="panel" id="new"><div className="panelHead"><div><h2>Quick add</h2><p>Income adds to an account, expense subtracts, and transfer moves money without changing total cash.</p></div></div>
      <form action={createTransaction} className="formGrid txForm">
        <label>Type<select name="type" defaultValue="EXPENSE"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option><option value="TRANSFER">Transfer</option></select></label>
        <label>Date<input name="date" type="date" defaultValue={bdToday()} required /></label>
        <label>Amount (BDT)<input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0" required /></label>
        <label>Account / from<select name="accountId" defaultValue=""><option value="">Not specified</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>To account <span className="labelHint">(transfer only)</span><select name="destinationAccountId" defaultValue=""><option value="">Not a transfer</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Category <span className="labelHint">(not needed for transfer)</span><input name="category" list="categories" placeholder="Food / Salary / Other" /><datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist></label>
        <label className="wide">Note<input name="note" placeholder="Optional details" /></label>
        <div className="formActions wide"><SubmitButton>Add transaction</SubmitButton></div>
      </form>
    </section>

    <section className="panel"><div className="panelHead historyHead"><div><h2>History</h2><p>{tx.length} matching records</p></div>
      <form className="filters">
        <input name="q" defaultValue={q} placeholder="Search note/category" />
        <select name="type" defaultValue={type}><option value="">All types</option><option value="EXPENSE">Expenses</option><option value="INCOME">Income</option><option value="TRANSFER">Transfers</option></select>
        <select name="account" defaultValue={account}><option value="">All accounts</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select name="category" defaultValue={category}><option value="">All categories</option>{categoryRows.map(row => <option key={row.category} value={row.category}>{row.category}</option>)}</select>
        <select name="sort" defaultValue={sort}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="amountHigh">Amount: high</option><option value="amountLow">Amount: low</option></select>
        <button className="btn" type="submit">Apply</button>{(q || type || account || category || sort !== "newest") && <Link className="btn" href="/transactions">Clear</Link>}
      </form></div>
      {tx.length ? <div className="tableWrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th>Note</th><th className="num">Amount</th><th></th></tr></thead><tbody>{tx.map(t => <tr key={t.id}><td>{shortDate(t.date)}</td><td><span className={`pill ${t.type.toLowerCase()}`}>{t.type}</span></td><td><b>{t.category}</b></td><td>{t.type === "TRANSFER" ? `${t.account?.name || "—"} → ${t.destinationAccount?.name || "—"}` : t.account?.name || "—"}</td><td className="muted">{t.note || (t.legacy ? "Imported from Excel" : "—")}</td><td className={`num ${t.type === "INCOME" ? "positive" : t.type === "EXPENSE" ? "negative" : ""}`}><b>{t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}{money(Number(t.amount))}</b></td><td><div className="actions"><Link className="miniBtn" href={`/transactions/${t.id}`}>Edit</Link><form action={deleteTransaction}><input type="hidden" name="id" value={t.id} /><ConfirmButton message="Delete this transaction and reverse its account balance effect?" /></form></div></td></tr>)}</tbody></table></div> : <div className="emptyState"><h3>No transactions found</h3><p>Try clearing the filters or add your first matching transaction.</p></div>}
    </section>
  </>;
}
