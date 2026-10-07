import assert from "node:assert/strict";
import test from "node:test";
import { calendarMonth, dateKey, monthKey, monthTransactions, monthlySeries, percentageChange, transactionReport } from "../features/finance/reporting";
import type { Transaction } from "../features/finance/types";

const row = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "tx", type: "expense", amount: 1_000_000, date: "2026-01-15",
  account: "Bank", category: "Food", color: "#f59e0b", description: "Test", ...overrides,
});

test("calendar groups complete Vietnam dates without mixing months or years", () => {
  const local = row({ date: "2026-01-01T00:30" });
  const instant = row({ id: "utc", date: "2025-12-31T17:00:00Z", status: "pending" });
  const calendar = calendarMonth([local, instant, row({ date: "2025-01-01" }), row({ date: "2026-02-01" })], "2026-01");
  assert.equal(dateKey("2025-12-31T17:00:00Z"), "2026-01-01");
  assert.equal(dateKey("2026-01-01T00:30"), "2026-01-01");
  assert.equal(dateKey("invalid"), "");
  assert.deepEqual(calendar.days[0].transactions, [local, instant]);
  assert.equal(calendar.days.slice(1).every(day => day.transactions.length === 0), true);
  assert.equal(calendar.days.length, 31);
  assert.equal(calendar.leadingDays, 3);
  assert.equal(calendar.previous, "2025-12");
  assert.equal(calendar.next, "2026-02");
});

test("calendar respects leap years, Monday-first alignment, and December rollover", () => {
  assert.equal(calendarMonth([], "2024-02").days.length, 29);
  assert.equal(calendarMonth([], "2026-02").days.length, 28);
  assert.equal(calendarMonth([], "2026-02").leadingDays, 6);
  assert.equal(calendarMonth([], "2026-06").leadingDays, 0);
  assert.equal(calendarMonth([], "2026-04").days.length, 30);
  assert.equal(calendarMonth([], "2026-12").next, "2027-01");
});

test("monthKey converts instants to Vietnam time across month and year boundaries", () => {
  assert.equal(monthKey("2025-12-31T16:59:59Z"), "2025-12");
  assert.equal(monthKey("2025-12-31T17:00:00Z"), "2026-01");
  assert.equal(monthKey(new Date("2026-01-31T17:00:00Z")), "2026-02");
  assert.equal(monthKey("2026-02-01T00:00:00+08:00"), "2026-01");
  assert.equal(monthKey("2026-01-31T23:00:00-0500"), "2026-02");
});

test("date-only and unzoned timestamps keep their local month in every host timezone", () => {
  for (const value of ["2026-01-31", "2026-01-31T23:59", "2026-01-31T23:59:59.999", "2026-01-31 23:59:59"]) {
    assert.equal(monthKey(value), "2026-01");
  }
  assert.equal(monthKey("2024-02-29"), "2024-02");
});

test("invalid dates cannot silently roll into a reporting month", () => {
  for (const value of ["", "invalid", "2026-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "2026-01-00", "2026-01-01T24:00", "2026-01-01T12:60", "2026-01-01T12:00:60Z", "2026-01-01T12:00+99:00"]) {
    assert.equal(monthKey(value), "", value);
  }
  assert.equal(monthKey(new Date(NaN)), "");
});

test("monthTransactions selects year and Vietnam month, excludes pending, preserves transfers", () => {
  const posted = row({ id: "posted", status: "completed" });
  const legacy = row({ id: "legacy", date: "2025-12-31T17:00:00Z" });
  const transfer = row({ id: "transfer", type: "transfer", transferDirection: "in" });
  const rows = [posted, legacy, transfer, row({ status: "pending" }), row({ date: "2025-01-15" }), row({ date: "2026-02-01" }), row({ date: "bad" })];
  assert.deepEqual(monthTransactions(rows, "2026-01"), [posted, legacy, transfer]);
  assert.deepEqual(monthTransactions(rows, ""), []);
});

test("monthlySeries fills gaps and returns chronological million-VND totals across years", () => {
  const rows = [
    row({ date: "2025-11-01", type: "income", amount: 12_500_000 }),
    row({ date: "2025-11-30T17:00:00Z", amount: 250_000 }),
    row({ date: "2026-01-15", amount: 85_000 }),
    row({ date: "2026-01-15", amount: 1_000_000, status: "pending" }),
    row({ date: "2026-01-15", amount: 9_000_000, type: "transfer", transferDirection: "out" }),
    row({ date: "2026-02-01", amount: 5_000_000 }),
  ];
  assert.deepEqual(monthlySeries(rows, 4, "2026-01-31"), [
    { month: "2025-10", income: 0, expense: 0 },
    { month: "2025-11", income: 12.5, expense: 0 },
    { month: "2025-12", income: 0, expense: 0.25 },
    { month: "2026-01", income: 0, expense: 0.085 },
  ]);
});

test("all selectable periods include only their calendar months and compare equal windows", () => {
  const rows = Array.from({ length: 24 }, (_, i) => row({
    date: `${2025 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, "0")}-15`,
  }));
  for (const count of [1, 3, 6, 12]) {
    const report = transactionReport(rows, count, "2026-12-15");
    assert.equal(report.expense, count * 1_000_000);
    assert.equal(report.previousExpense, count * 1_000_000);
    assert.equal(report.keys.length, count);
    assert.equal(report.previousKeys.length, count);
    assert.equal(report.keys.at(-1), "2026-12");
    assert.equal(report.keys.some(key => report.previousKeys.includes(key)), false);
    assert.equal(report.series.length, count);
    assert.equal(report.expenseChange, 0);
  }
});

test("report categories and comparisons use only posted transactions in the selected period", () => {
  const rows = [
    row({ type: "income", amount: 10_000_000 }),
    row({ amount: 2_000_000 }),
    row({ amount: 500_000, status: "completed" }),
    row({ category: "Rent", amount: 3_000_000, color: "#abc" }),
    row({ amount: 99_000_000, status: "pending" }),
    row({ type: "transfer", amount: 99_000_000 }),
    row({ date: "2025-12-15", type: "income", amount: 5_000_000 }),
    row({ date: "2025-12-15", amount: 2_000_000 }),
    row({ date: "2026-02-15", amount: 99_000_000 }),
  ];
  const before = structuredClone(rows);
  const report = transactionReport(rows, 1, "2026-01-31");
  assert.equal(report.income, 10_000_000);
  assert.equal(report.expense, 5_500_000);
  assert.equal(report.incomeChange, 100);
  assert.equal(report.expenseChange, 175);
  assert.equal(report.cashFlowChange, 50);
  assert.deepEqual(report.categoryData, [
    { name: "Rent", value: 3_000_000, color: "#abc" },
    { name: "Food", value: 2_500_000, color: "#f59e0b" },
  ]);
  assert.deepEqual(rows, before);
});

test("percentage changes handle zero and negative baselines without fabricated percentages", () => {
  assert.equal(percentageChange(0, 0), 0);
  assert.equal(percentageChange(100, 0), null);
  assert.equal(percentageChange(-100, 0), null);
  assert.equal(percentageChange(50, 100), -50);
  assert.equal(percentageChange(0, 100), -100);
  assert.equal(percentageChange(50, -100), 150);
  const report = transactionReport([], 3, "2026-01-01");
  assert.equal(report.income, 0);
  assert.equal(report.expenseChange, 0);
  assert.deepEqual(report.categoryData, []);
  assert.equal(report.series.every(point => point.income === 0 && point.expense === 0), true);
});

test("reporting validates period inputs and uses Vietnam time for the anchor", () => {
  assert.equal(monthlySeries([], 1, new Date("2025-12-31T17:00:00Z"))[0].month, "2026-01");
  for (const count of [0, -1, 1.5, NaN, Infinity, 1201]) {
    assert.throws(() => monthlySeries([], count, "2026-01-01"), RangeError);
  }
  assert.throws(() => transactionReport([], 1, "bad"), RangeError);
});
