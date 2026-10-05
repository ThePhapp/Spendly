import { and, desc, eq } from "drizzle-orm";
import type { AppUser } from "@/app/auth";
import { getDb } from "@/db";
import {
  accounts,
  budgets,
  categories,
  goalTransactions,
  recurringTransactions,
  savingGoals,
  transactions,
  userSettings,
  users,
} from "@/db/schema";
import type { Account, Budget, Goal, Transaction } from "@/features/finance/types";

export type WorkspaceData = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  profile: { name: string; email: string; isDemo: boolean };
};

const expenseCategories = [
  ["food", "Ăn uống", "utensils", "#f59e0b"],
  ["home", "Nhà ở", "house", "#8b5cf6"],
  ["move", "Di chuyển", "car", "#14b8a6"],
  ["family", "Gia đình", "users", "#ef4444"],
  ["fun", "Giải trí", "play", "#ec4899"],
  ["shop", "Mua sắm", "shopping-bag", "#3b82f6"],
] as const;

export async function loadWorkspace(user: AppUser): Promise<WorkspaceData> {
  const db = getDb();
  const prefix = `${user.userId}:`;

  await db.insert(users).values({
    id: user.userId,
    email: user.email,
    name: user.displayName,
  }).onConflictDoNothing();

  await db.insert(accounts).values([
    { id: `${prefix}a1`, userId: user.userId, name: "Vietcombank", type: "bank", initialBalance: 15_600_000, color: "#2563eb" },
    { id: `${prefix}a2`, userId: user.userId, name: "Ví tiền mặt", type: "cash", initialBalance: 1_250_000, color: "#14b8a6" },
    { id: `${prefix}a3`, userId: user.userId, name: "MoMo", type: "wallet", initialBalance: 820_000, color: "#d946ef" },
    { id: `${prefix}a4`, userId: user.userId, name: "Tiết kiệm", type: "saving", initialBalance: 50_000_000, color: "#8b5cf6" },
  ]).onConflictDoNothing();

  await db.insert(categories).values([
    ...expenseCategories.map(([id, name, icon, color]) => ({ id: `${prefix}${id}`, userId: user.userId, name, icon, color, kind: "expense" as const })),
    { id: `${prefix}salary`, userId: user.userId, name: "Lương", icon: "circle-dollar", color: "#22c55e", kind: "income" as const },
    { id: `${prefix}bonus`, userId: user.userId, name: "Freelance", icon: "briefcase", color: "#0ea5e9", kind: "income" as const },
  ]).onConflictDoNothing();

  const transactionSeeds = [
    ["t1", "income", "Lương tháng 10", "salary", "a1", 15_000_000, "2026-10-03T09:00"],
    ["t2", "expense", "Highlands Coffee", "food", "a3", 85_000, "2026-10-05T08:25"],
    ["t3", "expense", "WinMart", "family", "a1", 620_000, "2026-10-04T18:40"],
    ["t4", "expense", "Grab", "move", "a3", 128_000, "2026-10-04T07:30"],
    ["t5", "expense", "Tiền thuê nhà", "home", "a1", 5_000_000, "2026-10-02T10:00"],
    ["t6", "expense", "Netflix", "fun", "a1", 260_000, "2026-10-01T06:15"],
    ["t7", "expense", "Bữa trưa văn phòng", "food", "a2", 75_000, "2026-09-30T12:10"],
    ["t8", "expense", "Mua sách", "shop", "a1", 320_000, "2026-09-28T16:20"],
    ["t9", "income", "Dự án freelance", "bonus", "a1", 3_500_000, "2026-09-27T09:00"],
    ["t10", "expense", "Tiền điện", "home", "a1", 540_000, "2026-09-25T18:00"],
    ["t11", "expense", "Phở sáng", "food", "a2", 55_000, "2026-09-24T07:40"],
    ["t12", "expense", "Đổ xăng", "move", "a2", 120_000, "2026-09-22T17:30"],
    ["t13", "expense", "Vé xem phim", "fun", "a3", 180_000, "2026-09-20T20:00"],
    ["t14", "expense", "Quà sinh nhật", "family", "a1", 450_000, "2026-09-18T19:15"],
    ["t15", "expense", "Internet", "home", "a1", 220_000, "2026-09-15T08:00"],
    ["t16", "expense", "Circle K", "food", "a3", 98_000, "2026-09-12T21:15"],
    ["t17", "expense", "Áo sơ mi", "shop", "a1", 690_000, "2026-09-10T14:20"],
    ["t18", "income", "Lương tháng 9", "salary", "a1", 14_500_000, "2026-09-03T09:00"],
  ] as const;
  const transactionRows = transactionSeeds.map(([id, type, description, category, account, amount, date]) => ({
    id: `${prefix}${id}`,
    userId: user.userId,
    type,
    description,
    categoryId: `${prefix}${category}`,
    accountId: `${prefix}${account}`,
    amount,
    transactionDate: date,
  }));
  for (let index = 0; index < transactionRows.length; index += 6) {
    await db.insert(transactions).values(transactionRows.slice(index, index + 6)).onConflictDoNothing();
  }

  await db.insert(budgets).values([
    { id: `${prefix}b1`, userId: user.userId, categoryId: `${prefix}food`, name: "Ăn uống", amount: 3_000_000, period: "2026-10" },
    { id: `${prefix}b2`, userId: user.userId, categoryId: `${prefix}move`, name: "Di chuyển", amount: 1_500_000, period: "2026-10" },
    { id: `${prefix}b3`, userId: user.userId, categoryId: `${prefix}fun`, name: "Giải trí", amount: 1_000_000, period: "2026-10" },
  ]).onConflictDoNothing();

  await db.insert(savingGoals).values([
    { id: `${prefix}g1`, userId: user.userId, name: "MacBook Pro", targetAmount: 50_000_000, deadline: "2027-06-01", icon: "Laptop", color: "#8b5cf6" },
    { id: `${prefix}g2`, userId: user.userId, name: "Du lịch Nhật Bản", targetAmount: 30_000_000, deadline: "2027-03-20", icon: "Plane", color: "#14b8a6" },
  ]).onConflictDoNothing();

  await db.insert(goalTransactions).values([
    { id: `${prefix}gt1`, userId: user.userId, goalId: `${prefix}g1`, amount: 20_000_000, transactionDate: "2026-10-01" },
    { id: `${prefix}gt2`, userId: user.userId, goalId: `${prefix}g2`, amount: 18_500_000, transactionDate: "2026-09-20" },
  ]).onConflictDoNothing();

  await db.insert(recurringTransactions).values([
    { id: `${prefix}r1`, userId: user.userId, accountId: `${prefix}a1`, categoryId: `${prefix}home`, type: "expense", amount: 5_000_000, description: "Tiền thuê nhà", frequency: "monthly", nextRunAt: "2026-11-05" },
    { id: `${prefix}r2`, userId: user.userId, accountId: `${prefix}a1`, categoryId: `${prefix}salary`, type: "income", amount: 15_000_000, description: "Lương", frequency: "monthly", nextRunAt: "2026-10-28" },
  ]).onConflictDoNothing();
  await db.insert(userSettings).values({ userId: user.userId }).onConflictDoNothing();

  const accountRows = await db.select().from(accounts).where(and(eq(accounts.userId, user.userId), eq(accounts.status, "active")));
  const transactionResult = await db.select({
    id: transactions.id,
    type: transactions.type,
    description: transactions.description,
    amount: transactions.amount,
    date: transactions.transactionDate,
    status: transactions.status,
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

  const workspaceTransactions: Transaction[] = transactionResult.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount,
    date: transaction.date,
    status: transaction.status,
    category: transaction.category ?? "Khác",
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
