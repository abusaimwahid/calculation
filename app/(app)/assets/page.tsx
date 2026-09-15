import { createAsset, deleteAsset, updateAsset } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Kpi } from "@/components/Kpi";
import { SubmitButton } from "@/components/SubmitButton";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const categories = ["Cash asset", "Bank savings", "Electronics", "Investment", "Property", "Other"];

export default async function Assets() {
  const assets = await prisma.asset.findMany({ orderBy: { currentValue: "desc" } });
  const total = assets.filter(asset => asset.includeInNetWorth).reduce((sum, asset) => sum + Number(asset.currentValue ?? asset.purchaseValue), 0);
  return <>
    <div className="pageHead"><div><p className="eyebrow">Owned items</p><h1>Assets</h1><p>Track present values and choose which assets count toward net worth.</p></div></div>
    <div className="kpiGrid small"><Kpi label="Assets in net worth" value={money(total)} note={`${assets.filter(asset => asset.includeInNetWorth).length} of ${assets.length} items included`} tone="blue" /></div>
    <section className="panel">{assets.length ? <div className="tableWrap"><table><thead><tr><th>Asset</th><th>Purchase value</th><th>Current details</th><th>Net worth</th><th></th></tr></thead><tbody>{assets.map(asset => <tr key={asset.id}>
      <td><b>{asset.name}</b><small className="cellMeta">{asset.category}</small></td><td>{money(Number(asset.purchaseValue))}</td>
      <td><form action={updateAsset} className="inlineForm assetInline"><input type="hidden" name="id" value={asset.id} /><input aria-label="Current value" name="currentValue" type="number" min="0" step="0.01" defaultValue={String(asset.currentValue ?? asset.purchaseValue)} /><select aria-label="Category" name="category" defaultValue={asset.category}>{categories.map(category => <option key={category}>{category}</option>)}</select><input aria-label="Status" name="status" defaultValue={asset.status} /><input aria-label="Note" name="note" defaultValue={asset.note || ""} placeholder="note" /><label className="checkLabel"><input name="includeInNetWorth" type="checkbox" defaultChecked={asset.includeInNetWorth} /> Include</label><button className="miniBtn" type="submit">Save</button></form></td>
      <td><span className={`pill ${asset.includeInNetWorth ? "income" : "neutral"}`}>{asset.includeInNetWorth ? "Included" : "Excluded"}</span></td>
      <td><form action={deleteAsset}><input type="hidden" name="id" value={asset.id} /><ConfirmButton message={`Delete ${asset.name}?`} /></form></td>
    </tr>)}</tbody></table></div> : <div className="emptyState"><h3>No assets yet</h3><p>Add a valuable item or investment below.</p></div>}</section>
    <section className="panel narrow"><div className="panelHead"><div><h2>Add asset</h2><p>Avoid including cash or savings here if it is already represented by an account.</p></div></div><form action={createAsset} className="formGrid">
      <label>Name<input name="name" required /></label><label>Category<select name="category" defaultValue="Other">{categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <label>Purchase value<input name="purchaseValue" type="number" min="0" step="0.01" required /></label><label>Current value<input name="currentValue" type="number" min="0" step="0.01" placeholder="Same as purchase if blank" /></label>
      <label>Status<input name="status" defaultValue="Owned" /></label><label>Note<input name="note" /></label>
      <label className="checkLabel wide"><input name="includeInNetWorth" type="checkbox" defaultChecked /> Include this asset in net worth</label>
      <div className="formActions wide"><SubmitButton>Add asset</SubmitButton></div>
    </form></section>
  </>;
}
