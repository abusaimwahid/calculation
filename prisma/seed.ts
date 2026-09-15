import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const dt=(s:string)=>new Date(`${s}T12:00:00.000Z`);

async function main(){
  await prisma.cryptoFlow.deleteMany(); await prisma.cryptoHolding.deleteMany(); await prisma.transaction.deleteMany(); await prisma.account.deleteMany(); await prisma.asset.deleteMany(); await prisma.debt.deleteMany(); await prisma.setting.deleteMany();

  await prisma.setting.createMany({data:[{key:"exchangeRate",value:"127"},{key:"availableUsdt",value:"933.65"},{key:"importSource",value:"Calculation.xlsm - 2026-09-15"}]});

  const accounts = await Promise.all([
    ["DBBL","BANK",8700],["Rocket","MOBILE_WALLET",0],["bKash","MOBILE_WALLET",5300],["Nagad","MOBILE_WALLET",100],["Somiti","SAVINGS",10000],["Pocket","CASH",3000],["Apple Gift","OTHER",768],
  ].map(([name,kind,balance])=>prisma.account.create({data:{name:String(name),kind:kind as any,balance:Number(balance),note:"Imported from Excel Portfolio"}})));
  const accountByName=Object.fromEntries(accounts.map(a=>[a.name,a.id]));

  const incomes:[string,number][]=[
    ["2024-08-01",9000],["2024-09-01",18000],["2024-10-01",18000],["2024-11-01",18000],["2024-12-01",22000],["2025-01-01",22000],["2025-02-01",22000],["2025-03-01",22000],["2025-04-01",22000],["2025-05-01",22000],["2025-06-01",22000],["2025-07-01",22000],["2025-08-01",22000],["2025-09-01",22000],["2025-10-01",23000],["2025-11-01",35000],["2025-12-01",35000],["2026-01-01",35000],["2026-02-01",35000],["2026-03-01",30000],["2026-04-01",59000],["2026-05-01",59000],["2026-06-01",50800],["2026-07-01",58000],["2026-08-01",60000]
  ];
  await prisma.transaction.createMany({data:incomes.map(([date,amount])=>({date:dt(date),type:"INCOME",amount,category:"Monthly Earnings",note:"Imported from Excel earnings history",legacy:true}))});

  const expenses:[string,number][]=[
    ["Licence",10000],["Passport",10000],["Bike Papers",30000],["Bike Maintenance",70000],["Tour",30000],["Personal Expenses",90000],["Shopping",30000],["Given to People",20000],["Loss",2200],["Lost",1000],["Kurin",35100],["Security",1000],["Bag",1400],["Raju Garaj",3000],["Bag",1700],["Jacket",1300],["Ma",53000],["Visa Cost",6000],["Shoes",1270],["Helmet",8500],["Khala Mobile Display",1500]
  ];
  await prisma.transaction.createMany({data:expenses.map(([category,amount])=>({date:null,type:"EXPENSE",amount,category,note:"Imported from Excel; original date not recorded",legacy:true}))});

  const assetData:[string,number][]=[["Mac M4",62000],["13 Pro Max",48000],["Walpad",10000],["Portable monitor",9000],["Bike",279000],["Accessories",10000],["Apu Infinix 50 Plus",12000],["Ma M31",3000],["Speaker",7000],["Monitor Thunderbot",13000]];
  await prisma.asset.createMany({data:assetData.map(([name,value])=>({name,purchaseValue:value,currentValue:value,status:"Owned",note:"Imported from Excel"}))});

  const payables:[string,number][]=[["Apu",8450],["Sabiha WIFI",800],["Ahnaf",100],["Fixin (Claude+Claude+Gemini)",6392],["Razzak",50],["Pic Visual",1316],["Tailor",500],["Shihab",65000],["Wiz",950]];
  const receivables:[string,number][]=[["Akash",10500],["Trisha",3500],["Wiz",200],["Sabbir",900],["PicVisual",20000]];
  await prisma.debt.createMany({data:[...payables.map(([person,amount])=>({person,direction:"PAYABLE" as const,originalAmount:amount,remainingAmount:amount,note:"Imported from first Excel debt group"})),...receivables.map(([person,amount])=>({person,direction:"RECEIVABLE" as const,originalAmount:amount,remainingAmount:amount,note:"Imported from second Excel debt group (classified as receivable for clarity)"}))]});

  await prisma.cryptoHolding.create({data:{symbol:"APE",quantity:3586.2,costUsdt:1030.14,currentPriceUsdt:0.127,note:"Imported from Excel Portfolio"}});
  await prisma.cryptoFlow.createMany({data:[
    {date:dt("2026-09-15"),type:"BUY",amountUsdt:9793.24,note:"P2P & Binance Pay Deposit - imported from Excel"},
    {date:dt("2026-09-15"),type:"DEPOSIT",amountUsdt:1769.76,note:"Imported from Excel"},
    {date:dt("2026-09-15"),type:"SELL",amountUsdt:7581.81,note:"Imported from Excel"},
    {date:dt("2026-09-15"),type:"WITHDRAW",amountUsdt:2072.12,note:"Imported from Excel"}
  ]});

  console.log("Seeded LifeLedger from Calculation.xlsm", {accounts:accounts.length, defaultAccount:accountByName["DBBL"]});
}
main().finally(()=>prisma.$disconnect());
