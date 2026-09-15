import { notFound } from "next/navigation";
import Link from "next/link";
import { updateTransaction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { inputDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function EditTransaction({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, accounts] = await Promise.all([prisma.transaction.findUnique({ where: { id } }), prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } })]);
  if (!item) notFound();
  return <><div className="pageHead"><div><p className="eyebrow">Edit</p><h1>Transaction</h1><p>Correct any field and save.</p></div><Link className="btn" href="/transactions">← Back</Link></div><section className="panel narrow"><form action={updateTransaction} className="formGrid"><input type="hidden" name="id" value={item.id}/><label>Type<select name="type" defaultValue={item.type}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label><label>Date<input name="date" type="date" defaultValue={inputDate(item.date)}/></label><label>Amount (BDT)<input name="amount" type="number" step="0.01" defaultValue={String(item.amount)} required/></label><label>Account<select name="accountId" defaultValue={item.accountId || ""}><option value="">Not specified</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Category<input name="category" defaultValue={item.category} required/></label><label>Note<input name="note" defaultValue={item.note || ""}/></label><div className="formActions wide"><SubmitButton>Save changes</SubmitButton></div></form></section></>;
}
