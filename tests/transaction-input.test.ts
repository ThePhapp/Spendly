import assert from "node:assert/strict";
import test from "node:test";
import { transactionSchema } from "../lib/transaction-input";

const valid = {
  id: "new-transaction", type: "expense", amount: 25000,
  description: "Bữa sáng", category: "Ăn uống", account: "Ví tiền mặt",
  date: "2026-10-07T08:00:00+07:00",
};

test("transaction input preserves notes and trims fields", () => {
  const result = transactionSchema.parse({ ...valid, note: "  ghi chú  " });
  assert.equal(result.note, "ghi chú");
  assert.equal(transactionSchema.parse(valid).note, "");
});

test("transaction input rejects invalid dates and amounts", () => {
  for (const date of ["not-a-date", "2026-02-30T08:00:00Z", "2026-13-01T08:00:00Z", "2026-02-30"]) {
    assert.equal(transactionSchema.safeParse({ ...valid, date }).success, false, date);
  }
  for (const amount of [-100, 0, Infinity, NaN, 1_000_000_000_001]) {
    assert.equal(transactionSchema.safeParse({ ...valid, amount }).success, false);
  }
});

test("existing date-only and local timestamps can be duplicated", () => {
  for (const date of ["2026-10-07", "2026-10-03T09:00", "2026-10-03T09:00:00"]) {
    assert.equal(transactionSchema.safeParse({ ...valid, date }).success, true, date);
  }
});

test("transfers require a different destination account", () => {
  const transfer = { ...valid, type: "transfer", category: "" };
  assert.equal(transactionSchema.safeParse(transfer).success, false);
  assert.equal(transactionSchema.safeParse({ ...transfer, toAccount: valid.account }).success, false);
  assert.equal(transactionSchema.safeParse({ ...transfer, toAccount: "MoMo" }).success, true);
});

test("income and expense require a category and account", () => {
  assert.equal(transactionSchema.safeParse({ ...valid, category: " " }).success, false);
  assert.equal(transactionSchema.safeParse({ ...valid, account: " " }).success, false);
});
