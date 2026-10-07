import { expenseCategories, initializeWorkspace } from "./workspace-initialization";
import { and, desc, eq, sql } from "drizzle-orm";
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
import { monthKey } from "@/features/finance/reporting";

export type WorkspaceData = {
  asOf?: string;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  profile: { name: string; email: string; isDemo: boolean };
};

export async function loadWorkspace(user: AppUser): Promise<WorkspaceData> {
  const db = getDb();
  await initializeWorkspace(db, user);

  const [accountRows, transactionResult, budgetRows, goalRows, goalTransactionRows] = await db.batch([
  db.select().from(accounts).where(and(eq(accounts.userId, user.userId), eq(accounts.status, "active"))),
  db.select({
    id: transactions.id,
    type: transactions.type,
    description: transactions.description,
    amount: transactions.amount,
    date: transactions.transactionDate,
    status: transactions.status,
    note: transactions.note,
    transferId: transactions.transferId,
    transferDirection: transactions.transferDirection,
    // D1 batch results are keyed by SQL column name: joined names need aliases.
    category: sql<string | null>`${categories.name}`.as("category_name"),
    color: categories.color,
    account: sql<string>`${accounts.name}`.as("account_name"),
  }).from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, user.userId))
    .orderBy(desc(transactions.transactionDate)),
  db.select().from(budgets).where(eq(budgets.userId, user.userId)),
  db.select().from(savingGoals).where(eq(savingGoals.userId, user.userId)),
  db.select().from(goalTransactions).where(eq(goalTransactions.userId, user.userId)),
  ]);

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
  const expenseByCategoryMonth = new Map<string, number>();
  for (const transaction of transactionResult) {
    if (transaction.type !== "expense" || transaction.status === "pending") continue;
    const key = `${monthKey(transaction.date)}:${transaction.category}`;
    expenseByCategoryMonth.set(key, (expenseByCategoryMonth.get(key) ?? 0) + transaction.amount);
  }
  const savedByGoal = new Map<string, number>();
  for (const transaction of goalTransactionRows) {
    savedByGoal.set(transaction.goalId, (savedByGoal.get(transaction.goalId) ?? 0) + transaction.amount);
  }
  const workspaceBudgets: Budget[] = budgetRows.map((budget) => ({
    id: budget.id,
    name: budget.name,
    limit: budget.amount,
    period: budget.period,
    spent: expenseByCategoryMonth.get(`${budget.period}:${budget.name}`) ?? 0,
    color: expenseCategories.find((category) => category[1] === budget.name)?.[3] ?? "#2563eb",
  }));
  const workspaceGoals: Goal[] = goalRows.map((goal) => ({
    id: goal.id,
    name: goal.name,
    target: goal.targetAmount,
    saved: savedByGoal.get(goal.id) ?? 0,
    deadline: new Date(goal.deadline).toLocaleDateString("vi-VN"),
    color: goal.color,
    icon: goal.icon,
  }));

  return {
    asOf: new Date().toISOString(),
    accounts: workspaceAccounts,
    transactions: workspaceTransactions,
    budgets: workspaceBudgets,
    goals: workspaceGoals,
    profile: { name: user.displayName, email: user.email, isDemo: user.isDemo },
  };
}
