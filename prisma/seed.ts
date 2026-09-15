import { AccountKind, DebtDirection, PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();
const dt = (value: string) => new Date(`${value}T12:00:00.000Z`);

async function main() {
  const settings = [
    { key: "exchangeRate", value: "127" },
    { key: "availableUsdt", value: "933.65" },
    { key: "importSource", value: "Calculation.xlsm - 2026-09-15" },
  ];
  for (const setting of settings) {
    await prisma.setting.upsert({ where: { key: setting.key }, create: setting, update: {} });
  }

  const accountData: [string, AccountKind, number][] = [
    ["DBBL", "BANK", 8700], ["Rocket", "MOBILE_WALLET", 0], ["bKash", "MOBILE_WALLET", 5300],
    ["Nagad", "MOBILE_WALLET", 100], ["Somiti", "SAVINGS", 10000], ["Pocket", "CASH", 3000], ["Apple Gift", "OTHER", 768],
  ];
  for (const [name, kind, balance] of accountData) {
    await prisma.account.upsert({ where: { name }, create: { name, kind, balance, note: "Imported from Excel Portfolio" }, update: {} });
  }

  const incomes: [string, number][] = [
    ["2024-08-01",9000],["2024-09-01",18000],["2024-10-01",18000],["2024-11-01",18000],["2024-12-01",22000],
    ["2025-01-01",22000],["2025-02-01",22000],["2025-03-01",22000],["2025-04-01",22000],["2025-05-01",22000],["2025-06-01",22000],["2025-07-01",22000],["2025-08-01",22000],["2025-09-01",22000],["2025-10-01",23000],["2025-11-01",35000],["2025-12-01",35000],
    ["2026-01-01",35000],["2026-02-01",35000],["2026-03-01",30000],["2026-04-01",59000],["2026-05-01",59000],["2026-06-01",50800],["2026-07-01",58000],["2026-08-01",60000],
  ];
  for (const [date, amount] of incomes) {
    const importKey = `excel-income-${date}`;
    await prisma.transaction.upsert({
      where: { importKey },
      create: { importKey, date: dt(date), type: TransactionType.INCOME, amount, category: "Monthly Earnings", note: "Imported from Excel earnings history", legacy: true },
      update: {},
    });
  }

  const expenses: [string, number][] = [
    ["Licence",10000],["Passport",10000],["Bike Papers",30000],["Bike Maintenance",70000],["Tour",30000],["Personal Expenses",90000],["Shopping",30000],["Given to People",20000],["Loss",2200],["Lost",1000],["Kurin",35100],["Security",1000],["Bag",1400],["Raju Garaj",3000],["Bag",1700],["Jacket",1300],["Ma",53000],["Visa Cost",6000],["Shoes",1270],["Helmet",8500],["Khala Mobile Display",1500],
  ];
  for (const [index, [category, amount]] of expenses.entries()) {
    const importKey = `excel-expense-${index + 1}`;
    await prisma.transaction.upsert({
      where: { importKey },
      create: { importKey, date: null, type: TransactionType.EXPENSE, amount, category, note: "Imported from Excel; original date not recorded", legacy: true },
      update: {},
    });
  }

  const assets: [string, number, string][] = [
    ["Mac M4",62000,"Electronics"],["13 Pro Max",48000,"Electronics"],["Walpad",10000,"Electronics"],["Portable monitor",9000,"Electronics"],["Bike",279000,"Other"],["Accessories",10000,"Other"],["Apu Infinix 50 Plus",12000,"Electronics"],["Ma M31",3000,"Electronics"],["Speaker",7000,"Electronics"],["Monitor Thunderbot",13000,"Electronics"],
  ];
  for (const [name, value, category] of assets) {
    const importKey = `excel-asset-${name.toLowerCase().replaceAll(" ", "-")}`;
    await prisma.asset.upsert({ where: { importKey }, create: { importKey, name, purchaseValue: value, currentValue: value, category, status: "Owned", note: "Imported from Excel" }, update: {} });
  }

  const payables: [string, number][] = [["Apu",8450],["Sabiha WIFI",800],["Ahnaf",100],["Fixin (Claude+Claude+Gemini)",6392],["Razzak",50],["Pic Visual",1316],["Tailor",500],["Shihab",65000],["Wiz",950]];
  const receivables: [string, number][] = [["Akash",10500],["Trisha",3500],["Wiz",200],["Sabbir",900],["PicVisual",20000]];
  for (const [direction, rows] of [[DebtDirection.PAYABLE, payables], [DebtDirection.RECEIVABLE, receivables]] as const) {
    for (const [index, [person, amount]] of rows.entries()) {
      const importKey = `excel-debt-${direction.toLowerCase()}-${index + 1}`;
      await prisma.debt.upsert({
        where: { importKey },
        create: { importKey, person, direction, originalAmount: amount, remainingAmount: amount, note: direction === DebtDirection.PAYABLE ? "Imported from first Excel debt group" : "Imported from second Excel debt group (classified as receivable for clarity)" },
        update: {},
      });
    }
  }

  await prisma.cryptoHolding.upsert({
    where: { symbol: "APE" },
    create: { symbol: "APE", quantity: 3586.2, costUsdt: 1030.14, currentPriceUsdt: 0.127, note: "Imported from Excel Portfolio" },
    update: {},
  });
  const flows = [
    ["BUY",9793.24,"P2P & Binance Pay Deposit - imported from Excel"],
    ["DEPOSIT",1769.76,"Imported from Excel"],
    ["SELL",7581.81,"Imported from Excel"],
    ["WITHDRAW",2072.12,"Imported from Excel"],
  ] as const;
  for (const [index, [type, amountUsdt, note]] of flows.entries()) {
    const importKey = `excel-crypto-flow-${index + 1}`;
    await prisma.cryptoFlow.upsert({ where: { importKey }, create: { importKey, date: dt("2026-09-15"), type, amountUsdt, note }, update: {} });
  }

  console.log("LifeLedger seed complete (existing records preserved).");
}

main().finally(() => prisma.$disconnect());
