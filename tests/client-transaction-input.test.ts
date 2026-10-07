import assert from "node:assert/strict";
import test from "node:test";
import { parseVndAmount } from "../features/transactions/input";
import { transactionSchema } from "../lib/transaction-input";

test("VND input accepts whole digits and consistent groups of thousands", () => {
  for (const input of ["1234567", "1.234.567", "1,234,567", "1 234 567", " 1234567 "]) {
    assert.equal(parseVndAmount(input), 1_234_567, input);
  }
  assert.equal(parseVndAmount("1.000.000.000.000"), 1_000_000_000_000);
});

test("VND input rejects signs, text, fractions, malformed groups and out-of-range amounts", () => {
  for (const input of ["-100", "+100", "abc12", "1.5", "1,5", "1e3", "", " ", "0", "1.234,567", "12 34", "1000.000", "1_000", "1000000000001", "9".repeat(400)]) {
    assert.equal(parseVndAmount(input), undefined, input);
  }
});

test("dialog's shared validation enforces description and note limits", () => {
  const draft = { id: "new", type: "expense", amount: 100, description: "Lunch", category: "Ăn uống", account: "Vietcombank", date: "2026-10-07T00:00:00.000Z", note: "" };
  assert.equal(transactionSchema.safeParse({ ...draft, description: "x".repeat(160), note: "x".repeat(2000) }).success, true);
  assert.equal(transactionSchema.safeParse({ ...draft, description: "x".repeat(161) }).success, false);
  assert.equal(transactionSchema.safeParse({ ...draft, note: "x".repeat(2001) }).success, false);
});
