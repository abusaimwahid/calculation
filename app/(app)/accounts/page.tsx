import { createAccount, updateAccount } from "@/app/actions";
import { Kpi } from "@/components/Kpi";
import { SubmitButton } from "@/components/SubmitButton";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function Accounts() {
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });
  const total = accounts.filter(a=>a.active).reduce((s,a)=>s+Number(a.balance),0);
  return <><div className="pageHead"><div><p className="eyebrow">Money locations</p><h1>Accounts & wallets</h1><p>Keep the current balance of DBBL, bKash, cash, savings and other wallets.</p></div></div><div className="kpiGrid small"><Kpi label="Total liquid balance" value={money(total)} note={`${accounts.length} accounts`} tone="blue"/></div>
  <section className="panel"><div className="panelHead"><div><h2>Current balances</h2><p>Update whenever a wallet/bank balance changes.</p></div></div><div className="cardGrid">{accounts.map(a=><form action={updateAccount} className="accountCard" key={a.id}><input type="hidden" name="id" value={a.id}/><div><span className="pill neutral">{a.kind.replaceAll("_"," ")}</span><h3>{a.name}</h3></div><label>Balance (BDT)<input name="balance" type="number" step="0.01" defaultValue={String(a.balance)}/></label><label>Note<input name="note" defaultValue={a.note || ""}/></label><SubmitButton className="btn">Update</SubmitButton></form>)}</div></section>
  <section className="panel narrow"><div className="panelHead"><div><h2>Add account</h2><p>Bank, mobile wallet, cash or savings.</p></div></div><form action={createAccount} className="formGrid"><label>Name<input name="name" placeholder="e.g. City Bank" required/></label><label>Type<select name="kind" defaultValue="BANK"><option value="BANK">Bank</option><option value="MOBILE_WALLET">Mobile wallet</option><option value="CASH">Cash</option><option value="SAVINGS">Savings</option><option value="OTHER">Other</option></select></label><label>Balance<input name="balance" type="number" step="0.01" defaultValue="0" required/></label><label>Note<input name="note"/></label><div className="formActions wide"><SubmitButton>Add account</SubmitButton></div></form></section></>;
}
