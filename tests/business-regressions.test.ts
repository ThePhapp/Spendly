import assert from "node:assert/strict";
import test from "node:test";
import { accountBalance, cashFlow, savingRate, totalExpense, totalIncome } from "../features/finance/calculations";
import type { Transaction } from "../features/finance/types";

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "tx", type: "income", amount: 100, description: "Test transaction",
  category: "Test", account: "Bank", date: "2026-10-01", color: "#000",
  ...overrides,
});

const posted = [
  transaction({ amount: 100, status: "completed" }),
  transaction({ amount: 50 }),
  transaction({ type: "expense", amount: 20, status: "completed" }),
  transaction({ type: "expense", amount: 10 }),
];
const pending = [
  transaction({ amount: 1_000, status: "pending" }),
  transaction({ type: "expense", amount: 500, status: "pending" }),
];

test("income excludes pending and includes completed and legacy records", () => {
  assert.equal(totalIncome([...posted, ...pending]), 150);
});

test("expenses exclude pending and include completed and legacy records", () => {
  assert.equal(totalExpense([...posted, ...pending]), 30);
});

test("cash flow and saving rate use only posted income and expenses", () => {
  assert.equal(cashFlow([...posted, ...pending]), 120);
  assert.equal(savingRate([...posted, ...pending]), 80);
  assert.equal(savingRate(pending), 0);
});

test("account balance excludes pending and other accounts", () => {
  const rows = [...posted, ...pending, transaction({ account: "Cash", amount: 9_000 })];
  assert.equal(accountBalance(200, "Bank", rows), 320);
});

test("directed transfer pairs move balances without creating income or expense", () => {
  const rows: Transaction[] = [
    transaction({ id: "out", type: "transfer", amount: 75, status: "completed", transferDirection: "out", toAccount: "Cash", transferId: "pair", note: "Move cash" }),
    transaction({ id: "in", type: "transfer", amount: 75, status: "completed", account: "Cash", transferDirection: "in", transferId: "pair" }),
  ];
  assert.equal(accountBalance(200, "Bank", rows), 125);
  assert.equal(accountBalance(10, "Cash", rows), 85);
  assert.equal(accountBalance(200, "Bank", rows) + accountBalance(10, "Cash", rows), 210);
  assert.equal(totalIncome(rows), 0);
  assert.equal(totalExpense(rows), 0);
  assert.equal(cashFlow(rows), 0);
  assert.equal(savingRate(rows), 0);
  assert.equal(savingRate([...posted, ...rows]), 80);
});

test("pending transfers do not change either account balance", () => {
  for (const transferDirection of ["in", "out"] as const) {
    const rows = [transaction({ type: "transfer", status: "pending", transferDirection })];
    assert.equal(accountBalance(200, "Bank", rows), 200);
  }
});

test("transfers with no direction remain balance neutral", () => {
  for (const status of [undefined, "completed"] as const) {
    const rows = [transaction({ type: "transfer", status, toAccount: "Cash" })];
    assert.equal(accountBalance(200, "Bank", rows), 200);
    assert.equal(accountBalance(10, "Cash", rows), 10);
  }
});

test("directed transfers without status retain legacy posted behavior", () => {
  assert.equal(accountBalance(200, "Bank", [transaction({ type: "transfer", transferDirection: "in" })]), 300);
  assert.equal(accountBalance(200, "Bank", [transaction({ type: "transfer", transferDirection: "out" })]), 100);
});

test("totals cover the supplied period, including year and month boundaries", () => {
  const rows = [
    transaction({ date: "2025-12-31", amount: 100 }),
    transaction({ date: "2026-01-01", amount: 50 }),
    transaction({ date: "2026-02-01", type: "expense", amount: 30 }),
  ];
  assert.equal(totalIncome(rows), 150);
  assert.equal(totalExpense(rows), 30);
  assert.equal(cashFlow(rows), 120);
  assert.equal(accountBalance(200, "Bank", rows), 320);
});

test("empty inputs preserve opening balance and return zero totals", () => {
  assert.equal(totalIncome([]), 0);
  assert.equal(totalExpense([]), 0);
  assert.equal(cashFlow([]), 0);
  assert.equal(savingRate([]), 0);
  assert.equal(accountBalance(200, "Bank", []), 200);
});
