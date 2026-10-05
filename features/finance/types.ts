export type TransactionType = "income" | "expense" | "transfer";
export type Transaction = { id: string; type: TransactionType; description: string; category: string; account: string; amount: number; date: string; color: string; status?: "completed" | "pending" };
export type Account = { id: string; name: string; type: string; balance: number; color: string };
export type Budget = { id: string; name: string; limit: number; spent: number; color: string };
export type Goal = { id: string; name: string; target: number; saved: number; deadline: string; color: string; icon: string };
