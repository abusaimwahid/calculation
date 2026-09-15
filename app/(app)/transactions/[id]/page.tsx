import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTransaction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { inputDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function EditTransaction({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.transaction.findUnique({ where: { id } });
  if (!item) notFound();
  const accounts = await prisma.account.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return <>
    <div className="pageHead"><div><p className="eyebrow">Edit</p><h1>Transaction</h1><p>The old balance effect is reversed before the corrected one is applied.</p></div><Link className="btn" href="/transactions">← Back</Link></div>
    <section className="panel narrow"><form action={updateTransaction} className="formGrid">
      <input type="hidden" name="id" value={item.id} />
      <label>Type<select name="type" defaultValue={item.type}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option><option value="TRANSFER">Transfer</option></select></label>
      <label>Date<input name="date" type="date" defaultValue={inputDate(item.date)} /></label>
      <label>Amount (BDT)<input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={String(item.amount)} required /></label>
      <label>Account / from<select name="accountId" defaultValue={item.accountId || ""}><option value="">Not specified</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.active ? "" : " (archived)"}</option>)}</select></label>
      <label>To account <span className="labelHint">(transfer only)</span><select name="destinationAccountId" defaultValue={item.destinationAccountId || ""}><option value="">Not a transfer</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.active ? "" : " (archived)"}</option>)}</select></label>
      <label>Category<input name="category" defaultValue={item.category} /></label>
      <label className="wide">Note<input name="note" defaultValue={item.note || ""} /></label>
      <div className="formActions wide"><SubmitButton>Save changes</SubmitButton></div>
    </form></section>
  </>;
}
