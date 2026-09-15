-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE "AccountKind" AS ENUM ('CASH', 'BANK', 'MOBILE_WALLET', 'SAVINGS', 'OTHER');
CREATE TYPE "DebtDirection" AS ENUM ('PAYABLE', 'RECEIVABLE');
CREATE TYPE "DebtStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID');
CREATE TYPE "CryptoFlowType" AS ENUM ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAW');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "category" TEXT NOT NULL,
    "accountId" TEXT,
    "destinationAccountId" TEXT,
    "note" TEXT,
    "legacy" BOOLEAN NOT NULL DEFAULT false,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AccountKind" NOT NULL DEFAULT 'OTHER',
    "balance" DECIMAL(18,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purchaseValue" DECIMAL(18,2) NOT NULL,
    "currentValue" DECIMAL(18,2),
    "category" TEXT NOT NULL DEFAULT 'Other',
    "includeInNetWorth" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Owned',
    "note" TEXT,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "direction" "DebtDirection" NOT NULL,
    "originalAmount" DECIMAL(18,2) NOT NULL,
    "remainingAmount" DECIMAL(18,2) NOT NULL,
    "status" "DebtStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CryptoHolding" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "costUsdt" DECIMAL(24,8) NOT NULL,
    "currentPriceUsdt" DECIMAL(24,8) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CryptoHolding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CryptoFlow" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "CryptoFlowType" NOT NULL,
    "amountUsdt" DECIMAL(24,8) NOT NULL,
    "note" TEXT,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CryptoFlow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- Indexes
CREATE UNIQUE INDEX "Transaction_importKey_key" ON "Transaction"("importKey");
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_destinationAccountId_idx" ON "Transaction"("destinationAccountId");
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");
CREATE UNIQUE INDEX "Asset_importKey_key" ON "Asset"("importKey");
CREATE UNIQUE INDEX "Debt_importKey_key" ON "Debt"("importKey");
CREATE INDEX "Debt_direction_status_idx" ON "Debt"("direction", "status");
CREATE UNIQUE INDEX "CryptoHolding_symbol_key" ON "CryptoHolding"("symbol");
CREATE UNIQUE INDEX "CryptoFlow_importKey_key" ON "CryptoFlow"("importKey");
CREATE INDEX "CryptoFlow_date_idx" ON "CryptoFlow"("date");

-- Foreign keys preserve financial history by preventing account deletion.
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Financial invariants are also enforced at the database boundary.
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_positive_amount" CHECK ("amount" > 0);
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_valid_transfer_accounts" CHECK (
  ("type" = 'TRANSFER' AND "accountId" IS NOT NULL AND "destinationAccountId" IS NOT NULL AND "accountId" <> "destinationAccountId")
  OR ("type" <> 'TRANSFER' AND "destinationAccountId" IS NULL)
);
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_nonnegative_values" CHECK ("purchaseValue" >= 0 AND ("currentValue" IS NULL OR "currentValue" >= 0));
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_valid_amounts" CHECK ("originalAmount" > 0 AND "remainingAmount" >= 0 AND "remainingAmount" <= "originalAmount");
ALTER TABLE "CryptoHolding" ADD CONSTRAINT "CryptoHolding_nonnegative_values" CHECK ("quantity" >= 0 AND "costUsdt" >= 0 AND "currentPriceUsdt" >= 0);
ALTER TABLE "CryptoFlow" ADD CONSTRAINT "CryptoFlow_positive_amount" CHECK ("amountUsdt" > 0);
