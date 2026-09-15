import { createDebt, deleteDebt, updateDebt } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Kpi } from "@/components/Kpi";
import { SubmitButton } from "@/components/SubmitButton";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function Debts() {
  const debts = await prisma.debt.findMany({ orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  const payable = debts.filter(d=>d.direction==="PAYABLE"&&d.status!=="PAID").reduce((s,d)=>s+Number(d.remainingAmount),0);
  const receivable = debts.filter(d=>d.direction==="RECEIVABLE"&&d.status!=="PAID").reduce((s,d)=>s+Number(d.remainingAmount),0);
  return <><div className="pageHead"><div><p className="eyebrow">Obligations</p><h1>Debts & receivables</h1><p>Separate money you owe from money other people owe you.</p></div></div><div className="kpiGrid small"><Kpi label="I owe" value={money(payable)} tone="bad"/><Kpi label="Owed to me" value={money(receivable)} tone="good"/></div>
  <section className="panel"><div className="tableWrap"><table><thead><tr><th>Person / source</th><th>Direction</th><th>Original / paid</th><th>Remaining & note</th><th>Status</th><th></th></tr></thead><tbody>{debts.map(d=><tr key={d.id}><td><b>{d.person}</b></td><td><span className={`pill ${d.direction==="PAYABLE"?"expense":"income"}`}>{d.direction==="PAYABLE"?"I owe":"Owed to me"}</span></td><td>{money(Number(d.originalAmount))}<small className="cellMeta">Paid / received: {money(Number(d.originalAmount)-Number(d.remainingAmount))}</small></td><td><form action={updateDebt} className="inlineForm"><input type="hidden" name="id" value={d.id}/><input aria-label="Remaining amount" name="remainingAmount" type="number" min="0" max={String(d.originalAmount)} step="0.01" defaultValue={String(d.remainingAmount)}/><input aria-label="Note" name="note" defaultValue={d.note || ""} placeholder="note"/><button className="miniBtn" type="submit">Save</button></form></td><td><span className={`pill ${d.status==="PAID"?"income":"neutral"}`}>{d.status}</span></td><td><form action={deleteDebt}><input type="hidden" name="id" value={d.id}/><ConfirmButton message={`Delete debt record for ${d.person}?`}/></form></td></tr>)}</tbody></table></div></section>
  <section className="panel narrow"><div className="panelHead"><div><h2>Add debt</h2></div></div><form action={createDebt} className="formGrid"><label>Person / source<input name="person" required/></label><label>Direction<select name="direction"><option value="PAYABLE">I owe this money</option><option value="RECEIVABLE">Someone owes me</option></select></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Due date<input name="dueDate" type="date"/></label><label className="wide">Note<input name="note"/></label><div className="formActions wide"><SubmitButton>Add debt</SubmitButton></div></form></section></>;
}
