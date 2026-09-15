import { createAsset, deleteAsset, updateAsset } from "@/app/actions";
import { Kpi } from "@/components/Kpi";
import { SubmitButton } from "@/components/SubmitButton";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function Assets() {
  const assets = await prisma.asset.findMany({ orderBy: { currentValue: "desc" } });
  const total = assets.reduce((s,a)=>s+Number(a.currentValue ?? a.purchaseValue),0);
  return <><div className="pageHead"><div><p className="eyebrow">Owned items</p><h1>Assets</h1><p>Track valuable items and their current value.</p></div></div><div className="kpiGrid small"><Kpi label="Current asset value" value={money(total)} note={`${assets.length} items`} tone="blue"/></div>
  <section className="panel"><div className="tableWrap"><table><thead><tr><th>Asset</th><th>Purchase value</th><th>Current value</th><th>Status / note</th><th></th></tr></thead><tbody>{assets.map(a=><tr key={a.id}><td><b>{a.name}</b></td><td>{money(Number(a.purchaseValue))}</td><td><form action={updateAsset} className="inlineForm"><input type="hidden" name="id" value={a.id}/><input name="currentValue" type="number" step="0.01" defaultValue={String(a.currentValue ?? a.purchaseValue)}/><input name="status" defaultValue={a.status}/><input name="note" defaultValue={a.note || ""} placeholder="note"/><button className="miniBtn" type="submit">Save</button></form></td><td>{a.status}{a.note ? ` · ${a.note}` : ""}</td><td><form action={deleteAsset}><input type="hidden" name="id" value={a.id}/><button className="miniBtn danger" type="submit">Delete</button></form></td></tr>)}</tbody></table></div></section>
  <section className="panel narrow"><div className="panelHead"><div><h2>Add asset</h2></div></div><form action={createAsset} className="formGrid"><label>Name<input name="name" required/></label><label>Purchase value<input name="purchaseValue" type="number" step="0.01" required/></label><label>Current value<input name="currentValue" type="number" step="0.01" placeholder="Same as purchase if blank"/></label><label>Status<input name="status" defaultValue="Owned"/></label><label className="wide">Note<input name="note"/></label><div className="formActions wide"><SubmitButton>Add asset</SubmitButton></div></form></section></>;
}
