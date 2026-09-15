# LifeLedger — Personal Finance Web App

A small, private, deployable finance tracker rebuilt from `Calculation.xlsm`.

## What is already included

- Private single-user login
- Dashboard with net worth, monthly income/expense, cash, assets, debts and crypto
- Daily income/expense CRUD + search/filter
- New income/expense automatically changes the selected account balance (edit/delete safely reverses the change)
- Accounts/wallet balances
- Assets and current values
- Payable debts and receivables
- USDT buy/deposit/sell/withdraw tracking
- Crypto holdings, current price, P/L, exchange rate and available USDT
- JSON full backup + CSV transaction export
- Mobile responsive interface
- Seed data migrated from the uploaded Excel workbook

### Excel data mapped into the app

- Accounts: DBBL, Rocket, bKash, Nagad, Somiti, Pocket, Apple Gift
- Assets: ৳453,000 imported
- Legacy expenses: ৳406,970 imported (dates were not present in Excel, so they are marked Legacy)
- Earnings history: ৳762,800 imported with monthly dates
- First debt group: ৳83,558 classified as **Payable** because the Excel dashboard subtracts it from cash
- Second debt group: ৳35,100 classified as **Receivable** because it appears to be money given to people; you can change/delete these records if needed
- Crypto: APE 3,586.2, cost 1,030.14 USDT, current price 0.127 USDT
- Available USDT: 933.65
- Exchange rate: 127 BDT/USDT
- Crypto flows: 11,563 USDT in and 9,653.93 USDT out, matching the workbook totals

## Fast setup (local)

1. Create a PostgreSQL database (Neon, Supabase Postgres, Railway Postgres, etc.).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, login password and session secret.
3. Install and initialize:

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000` and sign in with `APP_USER` / `APP_PASSWORD`.

## Deploy to a domain

Recommended quick route: Vercel + any hosted PostgreSQL database.

1. Push this folder to a private GitHub repository.
2. Import the repo in Vercel.
3. Add the same environment variables from `.env.example` in Vercel.
4. Run `npx prisma db push` and `npm run db:seed` once against the production database.
5. Deploy, then attach your custom domain from the hosting dashboard.

**Important:** run `db:seed` only on the first empty database. The seed intentionally clears existing tables before importing the Excel snapshot.

## Daily use

- Add every normal expense/income from **Transactions**.
- Update wallet/bank current balances from **Accounts** when needed.
- Update debt remaining amounts when you pay/receive money.
- Update crypto current price + available USDT from **Crypto**.
- Download a backup regularly from **Backup**.

This is intentionally kept smaller than accounting software so daily updates stay fast.
