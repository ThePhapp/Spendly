import assert from "node:assert/strict";
import test from "node:test";
import { dashboardSummary } from "../features/finance/dashboard-summary";
import type { Transaction } from "../features/finance/types";

test("dashboard balances and budget usage recalculate from current transactions", () => {
  const accounts = [{ id: "a", name: "Bank", balance: 100, type: "bank", color: "blue" }];
  const budgets = [{ id: "b", name: "Food", limit: 100, spent: 999, color: "red", period: "2026-10" }];
  const row: Transaction = { id: "t", type: "expense", amount: 20, account: "Bank", category: "Food", description: "Test", date: "2026-09-30T18:00:00Z", color: "red" };
  const now = new Date("2026-10-07T12:00:00Z");
  const summary = dashboardSummary(accounts, budgets, [row, { ...row, id: "p", status: "pending" }], now);
  assert.equal(summary.accounts[0].balance, 80);
  assert.equal(summary.budgets[0].spent, 20);
  assert.equal(summary.report.expense, 20);
  const deleted = dashboardSummary(accounts, budgets, [], now);
  assert.equal(deleted.accounts[0].balance, 100);
  assert.equal(deleted.budgets[0].spent, 0);
  assert.equal(accounts[0].balance, 100);
});
