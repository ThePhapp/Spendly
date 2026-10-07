import { accountBalance, totalExpense } from "./calculations";
import { monthKey, transactionReport } from "./reporting";
import type { Account, Budget, Transaction } from "./types";

export function dashboardSummary(accounts: Account[], budgets: Budget[], transactions: Transaction[], now: Date) {
  const currentMonth = monthKey(now);
  const spending = new Map<string, number>();
  for (const item of transactions) {
    if (item.type !== "expense" || item.status === "pending") continue;
    const key = `${monthKey(item.date)}:${item.category}`;
    spending.set(key, (spending.get(key) ?? 0) + item.amount);
  }
  return {
    report: transactionReport(transactions, 1, now),
    accounts: accounts.map(account => ({ ...account, balance: accountBalance(account.balance, account.name, transactions) })),
    budgets: budgets.map(budget => ({ ...budget, spent: spending.get(`${budget.period ?? currentMonth}:${budget.name}`) ?? 0 })),
    foodExpense: totalExpense(transactions.filter(item => item.category === "Ăn uống" && monthKey(item.date) === currentMonth)),
  };
}
