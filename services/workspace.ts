import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUser } from "@/app/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  accounts as demoAccounts,
  budgets as demoBudgets,
  goals as demoGoals,
  transactions as demoTransactions,
} from "@/features/finance/data";
import type { Account, Budget, Goal, Transaction } from "@/features/finance/types";

export type WorkspaceData = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  profile: { name: string; email: string; isDemo: boolean };
};

type AccountRow = { id: string; name: string; type: string; initial_balance: number | string; color: string };
type CategoryRow = { id: string; name: string; color: string };
type TransactionRow = { id: string; type: "income" | "expense" | "transfer"; description: string; amount: number | string; transaction_date: string; status: "completed" | "pending"; category_id: string | null; account_id: string };
type BudgetRow = { id: string; name: string; amount: number | string; period: string };
type GoalRow = { id: string; name: string; target_amount: number | string; deadline: string; color: string; icon: string };
type GoalTransactionRow = { goal_id: string; amount: number | string };

const expenseCategories = [
  ["food", "Ăn uống", "utensils", "#f59e0b"],
  ["home", "Nhà ở", "house", "#8b5cf6"],
  ["move", "Di chuyển", "car", "#14b8a6"],
  ["family", "Gia đình", "users", "#ef4444"],
  ["fun", "Giải trí", "play", "#ec4899"],
  ["shop", "Mua sắm", "shopping-bag", "#3b82f6"],
] as const;

export async function loadWorkspace(user: AppUser): Promise<WorkspaceData> {
  if (!isSupabaseConfigured()) return createDemoWorkspace(user);

  const supabase = await createClient();
  await ensureWorkspaceSeed(supabase, user);

  const [accountResult, categoryResult, transactionResult, budgetResult, goalResult, goalTransactionResult] = await Promise.all([
    supabase.from("accounts").select("id,name,type,initial_balance,color").eq("user_id", user.userId).eq("status", "active").order("created_at"),
    supabase.from("categories").select("id,name,color").eq("user_id", user.userId),
    supabase.from("transactions").select("id,type,description,amount,transaction_date,status,category_id,account_id").eq("user_id", user.userId).order("transaction_date", { ascending: false }),
    supabase.from("budgets").select("id,name,amount,period").eq("user_id", user.userId),
    supabase.from("saving_goals").select("id,name,target_amount,deadline,color,icon").eq("user_id", user.userId),
    supabase.from("goal_transactions").select("goal_id,amount").eq("user_id", user.userId),
  ]);

  for (const result of [accountResult, categoryResult, transactionResult, budgetResult, goalResult, goalTransactionResult]) {
    if (result.error) throw new Error(`Không thể tải dữ liệu Supabase: ${result.error.message}`);
  }

  const accountRows = (accountResult.data ?? []) as unknown as AccountRow[];
  const categoryRows = (categoryResult.data ?? []) as unknown as CategoryRow[];
  const transactionRows = (transactionResult.data ?? []) as unknown as TransactionRow[];
  const budgetRows = (budgetResult.data ?? []) as unknown as BudgetRow[];
  const goalRows = (goalResult.data ?? []) as unknown as GoalRow[];
  const goalTransactionRows = (goalTransactionResult.data ?? []) as unknown as GoalTransactionRow[];
  const accountById = new Map(accountRows.map((account) => [account.id, account]));
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));

  const transactions: Transaction[] = transactionRows.map((transaction) => {
    const category = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
    return {
      id: transaction.id,
      type: transaction.type,
      description: transaction.description,
      amount: Number(transaction.amount),
      date: transaction.transaction_date,
      status: transaction.status,
      category: category?.name ?? (transaction.type === "transfer" ? "Chuyển tiền" : "Khác"),
      color: category?.color ?? "#64748b",
      account: accountById.get(transaction.account_id)?.name ?? "Tài khoản đã lưu trữ",
    };
  });

  const accounts: Account[] = accountRows.map((account) => ({
    id: account.id,
    name: account.name,
    type: ({ bank: "Ngân hàng", cash: "Tiền mặt", wallet: "Ví điện tử", saving: "Tích lũy", credit: "Thẻ tín dụng", investment: "Đầu tư" } as Record<string, string>)[account.type] ?? account.type,
    balance: Number(account.initial_balance),
    color: account.color,
  }));

  const budgets: Budget[] = budgetRows.map((budget) => ({
    id: budget.id,
    name: budget.name,
    limit: Number(budget.amount),
    spent: transactions.filter((transaction) => transaction.type === "expense" && transaction.category === budget.name && transaction.date.startsWith(budget.period)).reduce((total, transaction) => total + transaction.amount, 0),
    color: expenseCategories.find((category) => category[1] === budget.name)?.[3] ?? "#2563eb",
  }));

  const goals: Goal[] = goalRows.map((goal) => ({
    id: goal.id,
    name: goal.name,
    target: Number(goal.target_amount),
    saved: goalTransactionRows.filter((transaction) => transaction.goal_id === goal.id).reduce((total, transaction) => total + Number(transaction.amount), 0),
    deadline: new Date(goal.deadline).toLocaleDateString("vi-VN"),
    color: goal.color,
    icon: goal.icon,
  }));

  return { accounts, transactions, budgets, goals, profile: { name: user.displayName, email: user.email, isDemo: false } };
}

function createDemoWorkspace(user: AppUser): WorkspaceData {
  return { accounts: demoAccounts, transactions: demoTransactions, budgets: demoBudgets, goals: demoGoals, profile: { name: user.displayName, email: user.email, isDemo: true } };
}

async function ensureWorkspaceSeed(supabase: SupabaseClient, user: AppUser) {
  const { count, error: countError } = await supabase.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", user.userId);
  if (countError) throw new Error(`Không thể kiểm tra workspace: ${countError.message}`);
  if ((count ?? 0) > 0) return;

  const prefix = `${user.userId}:`;
  const baseOperations = [
    supabase.from("users").upsert({ id: user.userId, email: user.email, name: user.displayName }, { onConflict: "id" }),
    supabase.from("accounts").insert([
      { id: `${prefix}a1`, user_id: user.userId, name: "Vietcombank", type: "bank", initial_balance: 15600000, color: "#2563eb" },
      { id: `${prefix}a2`, user_id: user.userId, name: "Ví tiền mặt", type: "cash", initial_balance: 1250000, color: "#14b8a6" },
      { id: `${prefix}a3`, user_id: user.userId, name: "MoMo", type: "wallet", initial_balance: 820000, color: "#d946ef" },
      { id: `${prefix}a4`, user_id: user.userId, name: "Tiết kiệm", type: "saving", initial_balance: 50000000, color: "#8b5cf6" },
    ]),
    supabase.from("categories").insert([
      ...expenseCategories.map(([id, name, icon, color]) => ({ id: `${prefix}${id}`, user_id: user.userId, name, icon, color, kind: "expense" })),
      { id: `${prefix}salary`, user_id: user.userId, name: "Lương", icon: "circle-dollar", color: "#22c55e", kind: "income" },
      { id: `${prefix}bonus`, user_id: user.userId, name: "Freelance", icon: "briefcase", color: "#0ea5e9", kind: "income" },
    ]),
  ];

  for (const operation of baseOperations) {
    const { error } = await operation;
    if (error && error.code !== "23505") throw new Error(`Không thể khởi tạo workspace: ${error.message}`);
  }

  const transactionRows = [
    ["t1", "income", "Lương tháng 10", "salary", "a1", 15000000, "2026-10-03T09:00:00+07:00"],
    ["t2", "expense", "Highlands Coffee", "food", "a3", 85000, "2026-10-05T08:25:00+07:00"],
    ["t3", "expense", "WinMart", "family", "a1", 620000, "2026-10-04T18:40:00+07:00"],
    ["t4", "expense", "Grab", "move", "a3", 128000, "2026-10-04T07:30:00+07:00"],
    ["t5", "expense", "Tiền thuê nhà", "home", "a1", 5000000, "2026-10-02T10:00:00+07:00"],
    ["t6", "expense", "Netflix", "fun", "a1", 260000, "2026-10-01T06:15:00+07:00"],
    ["t7", "expense", "Bữa trưa văn phòng", "food", "a2", 75000, "2026-09-30T12:10:00+07:00"],
    ["t8", "expense", "Mua sách", "shop", "a1", 320000, "2026-09-28T16:20:00+07:00"],
    ["t9", "income", "Dự án freelance", "bonus", "a1", 3500000, "2026-09-27T09:00:00+07:00"],
  ] as const;

  const dataOperations = [
    supabase.from("transactions").insert(transactionRows.map(([id, type, description, category, account, amount, date]) => ({ id: `${prefix}${id}`, user_id: user.userId, type, description, category_id: `${prefix}${category}`, account_id: `${prefix}${account}`, amount, transaction_date: date }))),
    supabase.from("budgets").insert([
      { id: `${prefix}b1`, user_id: user.userId, category_id: `${prefix}food`, name: "Ăn uống", amount: 3000000, period: "2026-10" },
      { id: `${prefix}b2`, user_id: user.userId, category_id: `${prefix}move`, name: "Di chuyển", amount: 1500000, period: "2026-10" },
      { id: `${prefix}b3`, user_id: user.userId, category_id: `${prefix}fun`, name: "Giải trí", amount: 1000000, period: "2026-10" },
    ]),
    supabase.from("saving_goals").insert([
      { id: `${prefix}g1`, user_id: user.userId, name: "MacBook Pro", target_amount: 50000000, deadline: "2027-06-01", icon: "Laptop", color: "#8b5cf6" },
      { id: `${prefix}g2`, user_id: user.userId, name: "Du lịch Nhật Bản", target_amount: 30000000, deadline: "2027-03-20", icon: "Plane", color: "#14b8a6" },
    ]),
    supabase.from("recurring_transactions").insert([
      { id: `${prefix}r1`, user_id: user.userId, account_id: `${prefix}a1`, category_id: `${prefix}home`, type: "expense", amount: 5000000, description: "Tiền thuê nhà", frequency: "monthly", next_run_at: "2026-11-05T00:00:00+07:00" },
      { id: `${prefix}r2`, user_id: user.userId, account_id: `${prefix}a1`, category_id: `${prefix}salary`, type: "income", amount: 15000000, description: "Lương", frequency: "monthly", next_run_at: "2026-10-28T00:00:00+07:00" },
    ]),
  ];

  for (const operation of dataOperations) {
    const { error } = await operation;
    if (error && error.code !== "23505") throw new Error(`Không thể tạo dữ liệu mẫu: ${error.message}`);
  }

  const { error: goalError } = await supabase.from("goal_transactions").insert([
    { id: `${prefix}gt1`, user_id: user.userId, goal_id: `${prefix}g1`, amount: 20000000, transaction_date: "2026-10-01" },
    { id: `${prefix}gt2`, user_id: user.userId, goal_id: `${prefix}g2`, amount: 18500000, transaction_date: "2026-09-20" },
  ]);
  if (goalError && goalError.code !== "23505") throw new Error(`Không thể tạo tiến độ mục tiêu: ${goalError.message}`);
}
