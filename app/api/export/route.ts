import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function esc(v: unknown) { const s=String(v??""); return `"${s.replaceAll('"','""')}"`; }

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const format = req.nextUrl.searchParams.get("format") || "json";
  if (format === "csv") {
    const rows = await prisma.transaction.findMany({ include:{account:true}, orderBy:[{date:"desc"},{createdAt:"desc"}] });
    const csv = [["Date","Type","Category","Account","Amount BDT","Note","Legacy"].map(esc).join(","), ...rows.map(r=>[r.date?.toISOString().slice(0,10)||"",r.type,r.category,r.account?.name||"",String(r.amount),r.note||"",r.legacy].map(esc).join(","))].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":`attachment; filename="lifeledger-transactions-${new Date().toISOString().slice(0,10)}.csv"` } });
  }
  const [transactions, accounts, assets, debts, holdings, flows, settings] = await Promise.all([prisma.transaction.findMany(),prisma.account.findMany(),prisma.asset.findMany(),prisma.debt.findMany(),prisma.cryptoHolding.findMany(),prisma.cryptoFlow.findMany(),prisma.setting.findMany()]);
  const json = JSON.stringify({ exportedAt:new Date().toISOString(), transactions, accounts, assets, debts, holdings, flows, settings }, (_,v)=>typeof v === "bigint" ? v.toString() : v, 2);
  return new NextResponse(json, { headers: { "Content-Type":"application/json", "Content-Disposition":`attachment; filename="lifeledger-backup-${new Date().toISOString().slice(0,10)}.json"` } });
}
