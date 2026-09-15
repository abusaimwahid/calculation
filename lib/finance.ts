export type BalanceTransaction = {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  accountId: string | null;
  destinationAccountId?: string | null;
};

export function transactionBalanceChanges(transaction: BalanceTransaction, reverse = false) {
  const direction = reverse ? -1 : 1;
  const changes = new Map<string, number>();
  const add = (accountId: string | null | undefined, amount: number) => {
    if (accountId) changes.set(accountId, (changes.get(accountId) ?? 0) + amount * direction);
  };

  if (transaction.type === "INCOME") add(transaction.accountId, transaction.amount);
  if (transaction.type === "EXPENSE") add(transaction.accountId, -transaction.amount);
  if (transaction.type === "TRANSFER") {
    add(transaction.accountId, -transaction.amount);
    add(transaction.destinationAccountId, transaction.amount);
  }
  return changes;
}

export function calculateNetWorth(values: {
  accounts: number;
  assets: number;
  receivables: number;
  crypto: number;
  payables: number;
}) {
  return values.accounts + values.assets + values.receivables + values.crypto - values.payables;
}
