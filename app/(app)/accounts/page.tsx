import Link from "next/link";
import { archiveAccount, createAccount, restoreAccount, updateAccount } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Kpi } from "@/components/Kpi";
import { SubmitButton } from "@/components/SubmitButton";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const kinds = ["CASH", "BANK", "MOBILE_WALLET", "SAVINGS", "OTHER"] as const;

export default async function Accounts() {
  const accounts = await prisma.account.findMany({ include: { _count: { select: { entries: true, incomingTransfers: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  const active = accounts.filter(account => account.active);
  const total = active.reduce((sum, account) => sum + Number(account.balance), 0);
  return <>
    <div className="pageHead"><div><p className="eyebrow">Money locations</p><h1>Accounts & wallets</h1><p>Balances update with transactions; manual edits are available for reconciliation.</p></div></div>
    <div className="kpiGrid small"><Kpi label="Total liquid balance" value={money(total)} note={`${active.length} active · ${accounts.length - active.length} archived`} tone="blue" /></div>
    <section className="panel"><div className="panelHead"><div><h2>Current balances</h2><p>Accounts with history are archived instead of deleted, preserving every transaction link.</p></div></div>
      <div className="cardGrid">{accounts.map(account => <div className={`accountCard ${account.active ? "" : "archived"}`} key={account.id}>
        <form action={updateAccount} className="accountEditForm">
          <input type="hidden" name="id" value={account.id} />
          <div className="accountTitle"><span className="pill neutral">{account.active ? account.kind.replaceAll("_", " ") : "ARCHIVED"}</span><Link href={`/accounts/${account.id}`}>{account._count.entries + account._count.incomingTransfers} entries →</Link></div>
          <label>Name<input name="name" defaultValue={account.name} required /></label>
          <label>Type<select name="kind" defaultValue={account.kind}>{kinds.map(kind => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}</select></label>
          <label>Balance (BDT)<input name="balance" type="number" step="0.01" inputMode="decimal" defaultValue={String(account.balance)} required /></label>
          <label>Note<input name="note" defaultValue={account.note || ""} /></label>
          <SubmitButton className="btn">Save changes</SubmitButton>
        </form>
        {account.active ? <form action={archiveAccount}><input type="hidden" name="id" value={account.id} /><ConfirmButton className="miniBtn" message="Archive this account? Its transaction history will remain intact.">Archive</ConfirmButton></form> : <form action={restoreAccount}><input type="hidden" name="id" value={account.id} /><button className="miniBtn" type="submit">Restore account</button></form>}
      </div>)}</div>
    </section>
    <section className="panel narrow"><div className="panelHead"><div><h2>Add account</h2><p>Bank, mobile wallet, cash, savings, or another money location.</p></div></div><form action={createAccount} className="formGrid">
      <label>Name<input name="name" placeholder="e.g. City Bank" required /></label>
      <label>Type<select name="kind" defaultValue="BANK">{kinds.map(kind => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}</select></label>
      <label>Opening balance<input name="balance" type="number" step="0.01" inputMode="decimal" defaultValue="0" required /></label>
      <label>Note<input name="note" /></label>
      <div className="formActions wide"><SubmitButton>Add account</SubmitButton></div>
    </form></section>
  </>;
}
