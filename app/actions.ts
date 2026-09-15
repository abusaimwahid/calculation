"use server";

import { AccountKind, CryptoFlowType, DebtDirection, Prisma, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, isAuthenticated, setSession, validCredentials } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const transactionTypes = new Set(Object.values(TransactionType));
const accountKinds = new Set(Object.values(AccountKind));
const debtDirections = new Set(Object.values(DebtDirection));
const cryptoFlowTypes = new Set(Object.values(CryptoFlowType));

function text(fd: FormData, key: string, maxLength = 500) {
  const value = String(fd.get(key) || "").trim();
  if (value.length > maxLength) throw new Error(`${key} is too long`);
  return value;
}

function requiredText(fd: FormData, key: string, maxLength = 100) {
  const value = text(fd, key, maxLength);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function decimal(fd: FormData, key: string, options: { positive?: boolean; nonNegative?: boolean } = {}) {
  const value = text(fd, key, 40);
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`Invalid ${key}`);
  const amount = new Prisma.Decimal(value);
  if (options.positive && amount.lte(0)) throw new Error(`${key} must be greater than zero`);
  if (options.nonNegative && amount.lt(0)) throw new Error(`${key} cannot be negative`);
  return amount;
}

function optionalDecimal(fd: FormData, key: string) {
  return text(fd, key) ? decimal(fd, key, { nonNegative: true }) : null;
}

function enumValue<T extends string>(fd: FormData, key: string, allowed: Set<T>) {
  const value = text(fd, key) as T;
  if (!allowed.has(value)) throw new Error(`Invalid ${key}`);
  return value;
}

function dateOrNull(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid date");
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return date;
}

async function guard() {
  if (!(await isAuthenticated())) redirect("/login");
}

function refresh(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

type TransactionInput = {
  type: TransactionType;
  amount: Prisma.Decimal;
  accountId: string | null;
  destinationAccountId: string | null;
};

async function validateTransactionAccounts(db: Prisma.TransactionClient, input: TransactionInput) {
  if (input.type === TransactionType.TRANSFER) {
    if (!input.accountId || !input.destinationAccountId) throw new Error("Transfers require both source and destination accounts");
    if (input.accountId === input.destinationAccountId) throw new Error("Transfer accounts must be different");
  } else if (input.destinationAccountId) {
    throw new Error("Destination account is only valid for transfers");
  }
  const ids = [input.accountId, input.destinationAccountId].filter((id): id is string => Boolean(id));
  if (ids.length) {
    const count = await db.account.count({ where: { id: { in: ids } } });
    if (count !== new Set(ids).size) throw new Error("Select valid accounts");
  }
}

async function applyBalanceEffect(db: Prisma.TransactionClient, input: TransactionInput, reverse = false) {
  const sign = reverse ? -1 : 1;
  const update = async (id: string | null, change: Prisma.Decimal) => {
    if (id) await db.account.update({ where: { id }, data: { balance: { increment: change.mul(sign) } } });
  };
  if (input.type === TransactionType.INCOME) await update(input.accountId, input.amount);
  if (input.type === TransactionType.EXPENSE) await update(input.accountId, input.amount.negated());
  if (input.type === TransactionType.TRANSFER) {
    await update(input.accountId, input.amount.negated());
    await update(input.destinationAccountId, input.amount);
  }
}

function transactionInput(fd: FormData): TransactionInput {
  const type = enumValue(fd, "type", transactionTypes);
  return {
    type,
    amount: decimal(fd, "amount", { positive: true }),
    accountId: text(fd, "accountId", 40) || null,
    destinationAccountId: text(fd, "destinationAccountId", 40) || null,
  };
}

export async function loginAction(fd: FormData) {
  const user = text(fd, "user", 100);
  const password = text(fd, "password", 500);
  if (!validCredentials(user, password)) redirect("/login?error=1");
  await setSession();
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function createTransaction(fd: FormData) {
  await guard();
  const input = transactionInput(fd);
  await prisma.$transaction(async (db) => {
    await validateTransactionAccounts(db, input);
    await db.transaction.create({
      data: {
        date: dateOrNull(text(fd, "date")),
        ...input,
        category: input.type === TransactionType.TRANSFER ? "Transfer" : requiredText(fd, "category", 80),
        note: text(fd, "note") || null,
      },
    });
    await applyBalanceEffect(db, input);
  });
  refresh("/dashboard", "/transactions", "/accounts");
  redirect("/transactions");
}

export async function updateTransaction(fd: FormData) {
  await guard();
  const id = requiredText(fd, "id", 40);
  const input = transactionInput(fd);
  await prisma.$transaction(async (db) => {
    const old = await db.transaction.findUniqueOrThrow({ where: { id } });
    await validateTransactionAccounts(db, input);
    await applyBalanceEffect(db, { type: old.type, amount: old.amount, accountId: old.accountId, destinationAccountId: old.destinationAccountId }, true);
    await db.transaction.update({
      where: { id },
      data: {
        date: dateOrNull(text(fd, "date")),
        ...input,
        category: input.type === TransactionType.TRANSFER ? "Transfer" : requiredText(fd, "category", 80),
        note: text(fd, "note") || null,
        legacy: false,
      },
    });
    await applyBalanceEffect(db, input);
  });
  refresh("/dashboard", "/transactions", "/accounts");
  redirect("/transactions");
}

export async function deleteTransaction(fd: FormData) {
  await guard();
  const id = requiredText(fd, "id", 40);
  await prisma.$transaction(async (db) => {
    const old = await db.transaction.findUniqueOrThrow({ where: { id } });
    await applyBalanceEffect(db, { type: old.type, amount: old.amount, accountId: old.accountId, destinationAccountId: old.destinationAccountId }, true);
    await db.transaction.delete({ where: { id } });
  });
  refresh("/dashboard", "/transactions", "/accounts");
}

export async function createAccount(fd: FormData) {
  await guard();
  await prisma.account.create({ data: { name: requiredText(fd, "name", 80), kind: enumValue(fd, "kind", accountKinds), balance: decimal(fd, "balance"), note: text(fd, "note") || null } });
  refresh("/accounts", "/dashboard");
}

export async function updateAccount(fd: FormData) {
  await guard();
  await prisma.account.update({
    where: { id: requiredText(fd, "id", 40) },
    data: { name: requiredText(fd, "name", 80), kind: enumValue(fd, "kind", accountKinds), balance: decimal(fd, "balance"), note: text(fd, "note") || null },
  });
  refresh("/accounts", "/dashboard");
}

export async function archiveAccount(fd: FormData) {
  await guard();
  await prisma.account.update({ where: { id: requiredText(fd, "id", 40) }, data: { active: false } });
  refresh("/accounts", "/dashboard", "/transactions");
}

export async function restoreAccount(fd: FormData) {
  await guard();
  await prisma.account.update({ where: { id: requiredText(fd, "id", 40) }, data: { active: true } });
  refresh("/accounts", "/dashboard", "/transactions");
}

export async function createAsset(fd: FormData) {
  await guard();
  const purchaseValue = decimal(fd, "purchaseValue", { nonNegative: true });
  await prisma.asset.create({
    data: { name: requiredText(fd, "name", 100), purchaseValue, currentValue: optionalDecimal(fd, "currentValue") ?? purchaseValue, category: requiredText(fd, "category", 50), includeInNetWorth: fd.get("includeInNetWorth") === "on", status: text(fd, "status", 40) || "Owned", note: text(fd, "note") || null },
  });
  refresh("/assets", "/dashboard");
}

export async function updateAsset(fd: FormData) {
  await guard();
  await prisma.asset.update({
    where: { id: requiredText(fd, "id", 40) },
    data: { currentValue: decimal(fd, "currentValue", { nonNegative: true }), category: requiredText(fd, "category", 50), includeInNetWorth: fd.get("includeInNetWorth") === "on", status: text(fd, "status", 40) || "Owned", note: text(fd, "note") || null },
  });
  refresh("/assets", "/dashboard");
}

export async function deleteAsset(fd: FormData) {
  await guard();
  await prisma.asset.delete({ where: { id: requiredText(fd, "id", 40) } });
  refresh("/assets", "/dashboard");
}

export async function createDebt(fd: FormData) {
  await guard();
  const amount = decimal(fd, "amount", { positive: true });
  await prisma.debt.create({ data: { person: requiredText(fd, "person", 100), direction: enumValue(fd, "direction", debtDirections), originalAmount: amount, remainingAmount: amount, dueDate: dateOrNull(text(fd, "dueDate")), note: text(fd, "note") || null } });
  refresh("/debts", "/dashboard");
}

export async function updateDebt(fd: FormData) {
  await guard();
  const id = requiredText(fd, "id", 40);
  const remaining = decimal(fd, "remainingAmount", { nonNegative: true });
  const debt = await prisma.debt.findUniqueOrThrow({ where: { id }, select: { originalAmount: true } });
  if (remaining.gt(debt.originalAmount)) throw new Error("Remaining amount cannot exceed original amount");
  const status = remaining.eq(0) ? "PAID" : remaining.lt(debt.originalAmount) ? "PARTIAL" : "OPEN";
  await prisma.debt.update({ where: { id }, data: { remainingAmount: remaining, status, note: text(fd, "note") || null } });
  refresh("/debts", "/dashboard");
}

export async function deleteDebt(fd: FormData) {
  await guard();
  await prisma.debt.delete({ where: { id: requiredText(fd, "id", 40) } });
  refresh("/debts", "/dashboard");
}

export async function saveCryptoSettings(fd: FormData) {
  await guard();
  const exchangeRate = decimal(fd, "exchangeRate", { positive: true }).toString();
  const availableUsdt = decimal(fd, "availableUsdt", { nonNegative: true }).toString();
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: "exchangeRate" }, update: { value: exchangeRate }, create: { key: "exchangeRate", value: exchangeRate } }),
    prisma.setting.upsert({ where: { key: "availableUsdt" }, update: { value: availableUsdt }, create: { key: "availableUsdt", value: availableUsdt } }),
  ]);
  refresh("/crypto", "/dashboard");
}

export async function createHolding(fd: FormData) {
  await guard();
  await prisma.cryptoHolding.create({ data: { symbol: requiredText(fd, "symbol", 20).toUpperCase(), quantity: decimal(fd, "quantity", { nonNegative: true }), costUsdt: decimal(fd, "costUsdt", { nonNegative: true }), currentPriceUsdt: decimal(fd, "currentPriceUsdt", { nonNegative: true }), note: text(fd, "note") || null } });
  refresh("/crypto", "/dashboard");
}

export async function updateHolding(fd: FormData) {
  await guard();
  await prisma.cryptoHolding.update({ where: { id: requiredText(fd, "id", 40) }, data: { quantity: decimal(fd, "quantity", { nonNegative: true }), costUsdt: decimal(fd, "costUsdt", { nonNegative: true }), currentPriceUsdt: decimal(fd, "currentPriceUsdt", { nonNegative: true }), note: text(fd, "note") || null } });
  refresh("/crypto", "/dashboard");
}

export async function deleteHolding(fd: FormData) {
  await guard();
  await prisma.cryptoHolding.delete({ where: { id: requiredText(fd, "id", 40) } });
  refresh("/crypto", "/dashboard");
}

export async function createCryptoFlow(fd: FormData) {
  await guard();
  await prisma.cryptoFlow.create({ data: { date: dateOrNull(text(fd, "date")) || new Date(), type: enumValue(fd, "type", cryptoFlowTypes), amountUsdt: decimal(fd, "amountUsdt", { positive: true }), note: text(fd, "note") || null } });
  refresh("/crypto", "/dashboard");
}

export async function deleteCryptoFlow(fd: FormData) {
  await guard();
  await prisma.cryptoFlow.delete({ where: { id: requiredText(fd, "id", 40) } });
  refresh("/crypto", "/dashboard");
}
