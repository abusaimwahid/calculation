import assert from "node:assert/strict";
import test from "node:test";
import { calculateNetWorth, transactionBalanceChanges } from "../lib/finance";

test("income and expense affect only their selected account", () => {
  assert.deepEqual([...transactionBalanceChanges({ type: "INCOME", amount: 1250, accountId: "bank" })], [["bank", 1250]]);
  assert.deepEqual([...transactionBalanceChanges({ type: "EXPENSE", amount: 300, accountId: "cash" })], [["cash", -300]]);
});

test("transfer preserves total cash and can be reversed exactly", () => {
  const changes = transactionBalanceChanges({ type: "TRANSFER", amount: 450, accountId: "bank", destinationAccountId: "wallet" });
  assert.equal([...changes.values()].reduce((sum, value) => sum + value, 0), 0);
  assert.deepEqual([...changes], [["bank", -450], ["wallet", 450]]);
  assert.deepEqual([...transactionBalanceChanges({ type: "TRANSFER", amount: 450, accountId: "bank", destinationAccountId: "wallet" }, true)], [["bank", 450], ["wallet", -450]]);
});

test("net worth adds owned value and subtracts payables once", () => {
  assert.equal(calculateNetWorth({ accounts: 100, assets: 200, receivables: 40, crypto: 60, payables: 25 }), 375);
});
