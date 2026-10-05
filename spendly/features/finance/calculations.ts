import type { Account, Budget, Goal, Transaction } from "./types";

export const totalIncome = (items: Transaction[]) => items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
export const totalExpense = (items: Transaction[]) => items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
export const totalBalance = (items: Account[]) => items.reduce((sum, item) => sum + item.balance, 0);
export const budgetUsage = (budget: Budget) => Math.min(999, budget.limit ? (budget.spent / budget.limit) * 100 : 0);
export const goalProgress = (goal: Goal) => Math.min(100, goal.target ? (goal.saved / goal.target) * 100 : 0);
export const savingRate = (items: Transaction[]) => { const income = totalIncome(items); return income ? ((income - totalExpense(items)) / income) * 100 : 0; };
export const formatCurrency = (value: number, currency = "VND") => new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
