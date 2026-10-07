import { expenseCategories, initializeWorkspace } from "./workspace-initialization";
import { and, desc, eq } from "drizzle-orm";
import type { AppUser } from "@/app/auth";
import { getDb } from "@/db";
import {
  accounts,
  budgets,
  categories,
  goalTransactions,
  savingGoals,
  transactions,
} from "@/db/schema";
import type { Account, Budget, Goal, Transaction } from "@/features/finance/types";

export type WorkspaceData = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  profile: { name: string; email: string; isDemo: boolean };
};

export async function loadWorkspace(user: AppUser): Promise<WorkspaceData> {
  const db = getDb();
  await initializeWorkspace(db, user);

  const accountRows = await db.select().from(accounts).where(and(eq(accounts.userId, user.userId), eq(accounts.status, "active")));
  const transactionResult = await db.select({
    id: transactions.id,
    type: transactions.type,
    description: transactions.description,
    amount: transactions.amount,
    date: transactions.transactionDate,
    status: transactions.status,
    note: transactions.note,
    transferId: transactions.transferId,
    transferDirection: transactions.transferDirection,
    category: categories.name,
    color: categories.color,
    account: accounts.name,
  }).from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, user.userId))
    .orderBy(desc(transactions.transactionDate));
  const budgetRows = await db.select().from(budgets).where(eq(budgets.userId, user.userId));
  const goalRows = await db.select().from(savingGoals).where(eq(savingGoals.userId, user.userId));
  const goalTransactionRows = await db.select().from(goalTransactions).where(eq(goalTransactions.userId, user.userId));

  const transferAccounts = new Map<string, typeof transactionResult>();
  for (const row of transactionResult) {
    if (row.transferId) {
      const legs = transferAccounts.get(row.transferId) ?? [];
      legs.push(row);
      transferAccounts.set(row.transferId, legs);
    }
  }
  const workspaceTransactions: Transaction[] = transactionResult.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount,
    date: transaction.date,
    status: transaction.status,
    note: transaction.note,
    transferId: transaction.transferId ?? undefined,
    transferDirection: transaction.transferDirection ?? undefined,
    toAccount: transaction.transferId ? transferAccounts.get(transaction.transferId)?.find(leg => leg.id !== transaction.id)?.account : undefined,
    category: transaction.type === "transfer" ? "Chuyển tiền" : transaction.category ?? "Khác",
    color: transaction.color ?? "#64748b",
    account: transaction.account,
  }));
  const workspaceAccounts: Account[] = accountRows.map((account) => ({
    id: account.id,
    name: account.name,
    type: ({ bank: "Ngân hàng", cash: "Tiền mặt", wallet: "Ví điện tử", saving: "Tích lũy", credit: "Thẻ tín dụng", investment: "Đầu tư" } as Record<string, string>)[account.type] ?? account.type,
    balance: account.initialBalance,
    color: account.color,
  }));
  const workspaceBudgets: Budget[] = budgetRows.map((budget) => ({
    id: budget.id,
    name: budget.name,
    limit: budget.amount,
    period: budget.period,
    spent: workspaceTransactions.filter((transaction) => transaction.type === "expense" && transaction.category === budget.name && transaction.date.startsWith(budget.period)).reduce((total, transaction) => total + transaction.amount, 0),
    color: expenseCategories.find((category) => category[1] === budget.name)?.[3] ?? "#2563eb",
  }));
  const workspaceGoals: Goal[] = goalRows.map((goal) => ({
    id: goal.id,
    name: goal.name,
    target: goal.targetAmount,
    saved: goalTransactionRows.filter((transaction) => transaction.goalId === goal.id).reduce((total, transaction) => total + transaction.amount, 0),
    deadline: new Date(goal.deadline).toLocaleDateString("vi-VN"),
    color: goal.color,
    icon: goal.icon,
  }));

  return {
    accounts: workspaceAccounts,
    transactions: workspaceTransactions,
    budgets: workspaceBudgets,
    goals: workspaceGoals,
    profile: { name: user.displayName, email: user.email, isDemo: user.isDemo },
  };
}
