import type { Account, Budget, Goal, Transaction } from "./types";

export const accounts: Account[] = [
  { id: "a1", name: "Vietcombank", type: "Ngân hàng", balance: 15600000, color: "#2563eb" },
  { id: "a2", name: "Ví tiền mặt", type: "Tiền mặt", balance: 1250000, color: "#14b8a6" },
  { id: "a3", name: "MoMo", type: "Ví điện tử", balance: 820000, color: "#d946ef" },
  { id: "a4", name: "Tiết kiệm", type: "Tích lũy", balance: 50000000, color: "#8b5cf6" },
];

export const transactions: Transaction[] = [
  { id: "t1", type: "income", description: "Lương tháng 10", category: "Lương", account: "Vietcombank", amount: 15000000, date: "2026-10-03T09:00", color: "#22c55e" },
  { id: "t2", type: "expense", description: "Highlands Coffee", category: "Ăn uống", account: "MoMo", amount: 85000, date: "2026-10-05T08:25", color: "#f59e0b" },
  { id: "t3", type: "expense", description: "WinMart", category: "Gia đình", account: "Vietcombank", amount: 620000, date: "2026-10-04T18:40", color: "#ef4444" },
  { id: "t4", type: "expense", description: "Grab", category: "Di chuyển", account: "MoMo", amount: 128000, date: "2026-10-04T07:30", color: "#14b8a6" },
  { id: "t5", type: "expense", description: "Tiền thuê nhà", category: "Nhà ở", account: "Vietcombank", amount: 5000000, date: "2026-10-02T10:00", color: "#8b5cf6" },
  { id: "t6", type: "expense", description: "Netflix", category: "Giải trí", account: "Vietcombank", amount: 260000, date: "2026-10-01T06:15", color: "#ec4899" },
];

export const budgets: Budget[] = [
  { id: "b1", name: "Ăn uống", limit: 3000000, spent: 2150000, color: "#f59e0b" },
  { id: "b2", name: "Di chuyển", limit: 1500000, spent: 890000, color: "#14b8a6" },
  { id: "b3", name: "Giải trí", limit: 1000000, spent: 850000, color: "#8b5cf6" },
];

export const goals: Goal[] = [
  { id: "g1", name: "MacBook Pro", target: 50000000, saved: 20000000, deadline: "01/06/2027", color: "#8b5cf6", icon: "Laptop" },
  { id: "g2", name: "Du lịch Nhật Bản", target: 30000000, saved: 18500000, deadline: "20/03/2027", color: "#14b8a6", icon: "Plane" },
];

export const monthlyData = [
  { month: "T5", income: 12.5, expense: 7.8 }, { month: "T6", income: 15.2, expense: 8.9 }, { month: "T7", income: 14.1, expense: 7.4 },
  { month: "T8", income: 16.8, expense: 9.2 }, { month: "T9", income: 14.5, expense: 8.4 }, { month: "T10", income: 15, expense: 7.2 },
];
