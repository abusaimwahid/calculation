import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function esc(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csv(rows: unknown[][]) {
  return `\uFEFF${rows.map(row => row.map(esc).join(",")).join("\n")}`;
}

function download(body: string, format: "json" | "csv", label: string) {
  const date = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lifeledger-${label}-${date}.${format}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const format = req.nextUrl.searchParams.get("format") || "json";

  if (format === "transactions-csv") {
    const rows = await prisma.transaction.findMany({ include: { account: true, destinationAccount: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
    return download(csv([
      ["Date", "Type", "Category", "Account / from", "To account", "Amount BDT", "Note", "Legacy"],
      ...rows.map(row => [row.date?.toISOString().slice(0, 10) || "", row.type, row.category, row.account?.name || "", row.destinationAccount?.name || "", String(row.amount), row.note || "", row.legacy]),
    ]), "csv", "transactions");
  }
  if (format === "accounts-csv") {
    const rows = await prisma.account.findMany({ orderBy: { name: "asc" } });
    return download(csv([["Name", "Type", "Balance BDT", "Active", "Note"], ...rows.map(row => [row.name, row.kind, String(row.balance), row.active, row.note || ""])]), "csv", "accounts");
  }
  if (format === "assets-csv") {
    const rows = await prisma.asset.findMany({ orderBy: { name: "asc" } });
    return download(csv([["Name", "Category", "Purchase value BDT", "Current value BDT", "Included in net worth", "Status", "Note"], ...rows.map(row => [row.name, row.category, String(row.purchaseValue), String(row.currentValue ?? row.purchaseValue), row.includeInNetWorth, row.status, row.note || ""])]), "csv", "assets");
  }
  if (format === "debts-csv") {
    const rows = await prisma.debt.findMany({ orderBy: { createdAt: "asc" } });
    return download(csv([["Person", "Direction", "Original BDT", "Paid/received BDT", "Remaining BDT", "Status", "Due date", "Note"], ...rows.map(row => [row.person, row.direction, String(row.originalAmount), row.originalAmount.minus(row.remainingAmount).toString(), String(row.remainingAmount), row.status, row.dueDate?.toISOString().slice(0, 10) || "", row.note || ""])]), "csv", "debts");
  }
  if (format === "crypto-csv") {
    const [holdings, flows] = await Promise.all([prisma.cryptoHolding.findMany({ orderBy: { symbol: "asc" } }), prisma.cryptoFlow.findMany({ orderBy: { date: "desc" } })]);
    return download(csv([
      ["Record", "Date/Symbol", "Type/Quantity", "Amount/Cost USDT", "Current price USDT", "Note"],
      ...holdings.map(row => ["Holding", row.symbol, String(row.quantity), String(row.costUsdt), String(row.currentPriceUsdt), row.note || ""]),
      ...flows.map(row => ["Flow", row.date.toISOString().slice(0, 10), row.type, String(row.amountUsdt), "", row.note || ""]),
    ]), "csv", "crypto");
  }
  if (format !== "json") return NextResponse.json({ error: "Unknown export format" }, { status: 400 });

  const [transactions, accounts, assets, debts, holdings, flows, settings] = await Promise.all([
    prisma.transaction.findMany(), prisma.account.findMany(), prisma.asset.findMany(), prisma.debt.findMany(),
    prisma.cryptoHolding.findMany(), prisma.cryptoFlow.findMany(), prisma.setting.findMany(),
  ]);
  const body = JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString(), transactions, accounts, assets, debts, holdings, flows, settings }, null, 2);
  return download(body, "json", "backup");
}
