import type { AppUser } from "@/app/auth";
import type { getDb } from "@/db";
import { eq, type SQL } from "drizzle-orm";
import { accounts, budgets, categories, goalTransactions, recurringTransactions, savingGoals, transactions, userSettings, users } from "@/db/schema";
import { workspaceSeedInsert, workspaceSeedQuery } from "./workspace-seed";

export const expenseCategories = [
  ["food", "Ăn uống", "utensils", "#f59e0b"],
  ["home", "Nhà ở", "house", "#8b5cf6"],
  ["move", "Di chuyển", "car", "#14b8a6"],
  ["family", "Gia đình", "users", "#ef4444"],
  ["fun", "Giải trí", "play", "#ec4899"],
  ["shop", "Mua sắm", "shopping-bag", "#3b82f6"],
] as const;

export async function initializeWorkspace(db: ReturnType<typeof getDb>, user: AppUser) {
  const [initialized] = await db.select({ userId: userSettings.userId }).from(userSettings)
    .where(eq(userSettings.userId, user.userId)).limit(1);
  if (initialized) return;

  const prefix = `${user.userId}:`;

  const seedQueries: SQL[] = [];
  const seed = (table: Parameters<typeof workspaceSeedInsert>[0], rows: Record<string, unknown>[]) => {
    seedQueries.push(workspaceSeedInsert(table, rows, user.userId));
  };
  const userInsert = db.insert(users).values({
    id: user.userId,
    email: user.email,
    name: user.displayName,
  }).onConflictDoNothing();

  seed(accounts, [
    { id: `${prefix}a1`, userId: user.userId, name: "Vietcombank", type: "bank", initialBalance: user.isDemo ? 15_600_000 : 0, color: "#2563eb" },
    { id: `${prefix}a2`, userId: user.userId, name: "Ví tiền mặt", type: "cash", initialBalance: user.isDemo ? 1_250_000 : 0, color: "#14b8a6" },
    { id: `${prefix}a3`, userId: user.userId, name: "MoMo", type: "wallet", initialBalance: user.isDemo ? 820_000 : 0, color: "#d946ef" },
    { id: `${prefix}a4`, userId: user.userId, name: "Tiết kiệm", type: "saving", initialBalance: user.isDemo ? 50_000_000 : 0, color: "#8b5cf6" },
  ]);

  seed(categories, [
    ...expenseCategories.map(([id, name, icon, color]) => ({ id: `${prefix}${id}`, userId: user.userId, name, icon, color, kind: "expense" as const })),
    { id: `${prefix}salary`, userId: user.userId, name: "Lương", icon: "circle-dollar", color: "#22c55e", kind: "income" as const },
    { id: `${prefix}bonus`, userId: user.userId, name: "Freelance", icon: "briefcase", color: "#0ea5e9", kind: "income" as const },
  ]);

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
  if (user.isDemo) {
  for (let index = 0; index < transactionRows.length; index += 6) {
    seed(transactions, transactionRows.slice(index, index + 6));
  }

  seed(budgets, [
    { id: `${prefix}b1`, userId: user.userId, categoryId: `${prefix}food`, name: "Ăn uống", amount: 3_000_000, period: "2026-10" },
    { id: `${prefix}b2`, userId: user.userId, categoryId: `${prefix}move`, name: "Di chuyển", amount: 1_500_000, period: "2026-10" },
    { id: `${prefix}b3`, userId: user.userId, categoryId: `${prefix}fun`, name: "Giải trí", amount: 1_000_000, period: "2026-10" },
  ]);

  seed(savingGoals, [
    { id: `${prefix}g1`, userId: user.userId, name: "MacBook Pro", targetAmount: 50_000_000, deadline: "2027-06-01", icon: "Laptop", color: "#8b5cf6" },
    { id: `${prefix}g2`, userId: user.userId, name: "Du lịch Nhật Bản", targetAmount: 30_000_000, deadline: "2027-03-20", icon: "Plane", color: "#14b8a6" },
  ]);

  seed(goalTransactions, [
    { id: `${prefix}gt1`, userId: user.userId, goalId: `${prefix}g1`, amount: 20_000_000, transactionDate: "2026-10-01" },
    { id: `${prefix}gt2`, userId: user.userId, goalId: `${prefix}g2`, amount: 18_500_000, transactionDate: "2026-09-20" },
  ]);

  seed(recurringTransactions, [
    { id: `${prefix}r1`, userId: user.userId, accountId: `${prefix}a1`, categoryId: `${prefix}home`, type: "expense", amount: 5_000_000, description: "Tiền thuê nhà", frequency: "monthly", nextRunAt: "2026-11-05" },
    { id: `${prefix}r2`, userId: user.userId, accountId: `${prefix}a1`, categoryId: `${prefix}salary`, type: "income", amount: 15_000_000, description: "Lương", frequency: "monthly", nextRunAt: "2026-10-28" },
  ]);
  }
  const settingsInsert = db.insert(userSettings).values({ userId: user.userId }).onConflictDoNothing();
  const queries = [userInsert.toSQL(), ...seedQueries.map(workspaceSeedQuery), settingsInsert.toSQL()];
  await db.$client.batch(queries.map(query => db.$client.prepare(query.sql).bind(...query.params)));


}
