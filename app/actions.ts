"use server";

import { AccountKind, CryptoFlowType, DebtDirection, DebtStatus, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, isAuthenticated, setSession, validCredentials } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function text(fd: FormData, key: string) {
  return String(fd.get(key) || "").trim();
}
function num(fd: FormData, key: string) {
  const n = Number(fd.get(key));
  if (!Number.isFinite(n)) throw new Error(`Invalid ${key}`);
  return n;
}
function dateOrNull(value: string) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}
async function guard() {
  if (!(await isAuthenticated())) redirect("/login");
}

export async function loginAction(fd: FormData) {
  const user = text(fd, "user");
  const password = text(fd, "password");
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
  const type = text(fd, "type") as TransactionType;
  const amount = num(fd, "amount");
  if (amount <= 0) throw new Error("Amount must be greater than zero");
  const accountId = text(fd, "accountId") || null;
  await prisma.$transaction(async (db) => {
    await db.transaction.create({
      data: {
        date: dateOrNull(text(fd, "date")),
        type,
        amount,
        category: text(fd, "category") || (type === "INCOME" ? "Income" : "General"),
        accountId,
        note: text(fd, "note") || null,
      },
    });
    if (accountId) {
      await db.account.update({
        where: { id: accountId },
        data: { balance: { increment: type === "INCOME" ? amount : -amount } },
      });
    }
  });
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function updateTransaction(fd: FormData) {
  await guard();
  const id = text(fd, "id");
  const type = text(fd, "type") as TransactionType;
  const amount = num(fd, "amount");
  const accountId = text(fd, "accountId") || null;
  await prisma.$transaction(async (db) => {
    const old = await db.transaction.findUniqueOrThrow({ where: { id } });
    if (old.accountId) {
      const reverse = old.type === "INCOME" ? -Number(old.amount) : Number(old.amount);
      await db.account.update({ where: { id: old.accountId }, data: { balance: { increment: reverse } } });
    }
    await db.transaction.update({
      where: { id },
      data: {
        date: dateOrNull(text(fd, "date")),
        type,
        amount,
        category: text(fd, "category"),
        accountId,
        note: text(fd, "note") || null,
        legacy: false,
      },
    });
    if (accountId) {
      await db.account.update({ where: { id: accountId }, data: { balance: { increment: type === "INCOME" ? amount : -amount } } });
    }
  });
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function deleteTransaction(fd: FormData) {
  await guard();
  const id = text(fd, "id");
  await prisma.$transaction(async (db) => {
    const old = await db.transaction.findUniqueOrThrow({ where: { id } });
    if (old.accountId) {
      const reverse = old.type === "INCOME" ? -Number(old.amount) : Number(old.amount);
      await db.account.update({ where: { id: old.accountId }, data: { balance: { increment: reverse } } });
    }
    await db.transaction.delete({ where: { id } });
  });
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function createAccount(fd: FormData) {
  await guard();
  await prisma.account.create({
    data: {
      name: text(fd, "name"),
      kind: text(fd, "kind") as AccountKind,
      balance: num(fd, "balance"),
      note: text(fd, "note") || null,
    },
  });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function updateAccount(fd: FormData) {
  await guard();
  await prisma.account.update({
    where: { id: text(fd, "id") },
    data: { balance: num(fd, "balance"), note: text(fd, "note") || null },
  });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function createAsset(fd: FormData) {
  await guard();
  const purchaseValue = num(fd, "purchaseValue");
  const current = text(fd, "currentValue");
  await prisma.asset.create({
    data: {
      name: text(fd, "name"),
      purchaseValue,
      currentValue: current ? Number(current) : purchaseValue,
      status: text(fd, "status") || "Owned",
      note: text(fd, "note") || null,
    },
  });
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

export async function updateAsset(fd: FormData) {
  await guard();
  await prisma.asset.update({
    where: { id: text(fd, "id") },
    data: {
      currentValue: num(fd, "currentValue"),
      status: text(fd, "status") || "Owned",
      note: text(fd, "note") || null,
    },
  });
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

export async function deleteAsset(fd: FormData) {
  await guard();
  await prisma.asset.delete({ where: { id: text(fd, "id") } });
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

export async function createDebt(fd: FormData) {
  await guard();
  const amount = num(fd, "amount");
  await prisma.debt.create({
    data: {
      person: text(fd, "person"),
      direction: text(fd, "direction") as DebtDirection,
      originalAmount: amount,
      remainingAmount: amount,
      dueDate: dateOrNull(text(fd, "dueDate")),
      note: text(fd, "note") || null,
    },
  });
  revalidatePath("/debts");
  revalidatePath("/dashboard");
}

export async function updateDebt(fd: FormData) {
  await guard();
  const remaining = num(fd, "remainingAmount");
  const status = (text(fd, "status") || (remaining <= 0 ? "PAID" : "OPEN")) as DebtStatus;
  await prisma.debt.update({
    where: { id: text(fd, "id") },
    data: { remainingAmount: Math.max(0, remaining), status, note: text(fd, "note") || null },
  });
  revalidatePath("/debts");
  revalidatePath("/dashboard");
}

export async function deleteDebt(fd: FormData) {
  await guard();
  await prisma.debt.delete({ where: { id: text(fd, "id") } });
  revalidatePath("/debts");
  revalidatePath("/dashboard");
}

export async function saveCryptoSettings(fd: FormData) {
  await guard();
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: "exchangeRate" }, update: { value: String(num(fd, "exchangeRate")) }, create: { key: "exchangeRate", value: String(num(fd, "exchangeRate")) } }),
    prisma.setting.upsert({ where: { key: "availableUsdt" }, update: { value: String(num(fd, "availableUsdt")) }, create: { key: "availableUsdt", value: String(num(fd, "availableUsdt")) } }),
  ]);
  revalidatePath("/crypto");
  revalidatePath("/dashboard");
}

export async function createHolding(fd: FormData) {
  await guard();
  await prisma.cryptoHolding.create({
    data: {
      symbol: text(fd, "symbol").toUpperCase(),
      quantity: num(fd, "quantity"),
      costUsdt: num(fd, "costUsdt"),
      currentPriceUsdt: num(fd, "currentPriceUsdt"),
      note: text(fd, "note") || null,
    },
  });
  revalidatePath("/crypto");
  revalidatePath("/dashboard");
}

export async function updateHolding(fd: FormData) {
  await guard();
  await prisma.cryptoHolding.update({
    where: { id: text(fd, "id") },
    data: {
      quantity: num(fd, "quantity"),
      costUsdt: num(fd, "costUsdt"),
      currentPriceUsdt: num(fd, "currentPriceUsdt"),
      note: text(fd, "note") || null,
    },
  });
  revalidatePath("/crypto");
  revalidatePath("/dashboard");
}

export async function deleteHolding(fd: FormData) {
  await guard();
  await prisma.cryptoHolding.delete({ where: { id: text(fd, "id") } });
  revalidatePath("/crypto");
  revalidatePath("/dashboard");
}

export async function createCryptoFlow(fd: FormData) {
  await guard();
  await prisma.cryptoFlow.create({
    data: {
      date: dateOrNull(text(fd, "date")) || new Date(),
      type: text(fd, "type") as CryptoFlowType,
      amountUsdt: num(fd, "amountUsdt"),
      note: text(fd, "note") || null,
    },
  });
  revalidatePath("/crypto");
  revalidatePath("/dashboard");
}

export async function deleteCryptoFlow(fd: FormData) {
  await guard();
  await prisma.cryptoFlow.delete({ where: { id: text(fd, "id") } });
  revalidatePath("/crypto");
  revalidatePath("/dashboard");
}
