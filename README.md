# LifeLedger

LifeLedger is a private, single-user personal finance app rebuilt from `Calculation.xlsm`. It keeps daily entry quick while tracking accounts, assets, payable and receivable debts, USDT, crypto holdings, and net worth.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- PostgreSQL with Prisma ORM
- Signed, expiring, HTTP-only cookie authentication
- Vercel-ready production configuration

## Features

- Income, expense, and account-to-account transfer CRUD
- Search, account/category/type filters, and sorting
- Transaction-safe balance updates on create, edit, and delete
- Safe account archiving with complete history
- Assets with category and explicit net-worth inclusion
- Payable/receivable debts with open, partial, and paid states
- Manual USDT exchange rates and crypto prices (no fabricated live prices)
- Timestamped full JSON backup plus CSV exports
- Responsive desktop and mobile interface

Net worth is calculated once from active account balances + included assets + receivables + available USDT and crypto holdings − payables. Transfers do not count as income or expense.

## Local setup

Requirements: Node.js 20+ and PostgreSQL.

```bash
npm ci
cp .env.example .env.local
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Development-only login defaults are used when auth variables are absent outside production; setting all variables locally is strongly recommended.

## Environment variables

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
APP_USER="admin"
APP_PASSWORD="a-strong-private-password"
SESSION_SECRET="at-least-32-cryptographically-random-characters"
NEXT_PUBLIC_APP_NAME="LifeLedger"
```

Never commit `.env` or `.env.local`. Production refuses to authenticate when required auth configuration is missing or the session secret is too short.

## Database and seed

Validate and deploy committed migrations:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate deploy
```

The seed imports the original workbook snapshot using stable import keys. It is idempotent and never clears tables or overwrites later balance/value edits. Do not use `prisma migrate reset` on production.

Imported concepts include DBBL, Rocket, bKash, Nagad, Somiti, Pocket, Apple Gift, historical earnings and expenses, physical assets, both debt groups, APE holdings, USDT flows, available USDT, and the workbook exchange rate. Legacy expenses whose dates were absent remain explicitly marked as legacy and are excluded from monthly totals.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Vercel deployment

1. Create a private Vercel project linked to this repository.
2. Add all required environment variables for Production (and Preview if used).
3. Run `npx prisma migrate deploy` against the intended production database.
4. Deploy with `vercel --prod` or through the linked Git integration.

Use a pooled Neon PostgreSQL connection string for the application when recommended by Neon. Keep credentials exclusively in Vercel environment variables.

## Backups

The **Backup** page provides a full timestamped JSON snapshot and separate CSV exports for transactions, accounts, assets, debts, and crypto. Exports require authentication and use private, no-store response headers. Store downloaded backups somewhere private.
