import assert from "node:assert/strict";
import test from "node:test";

// Run against a local Worker with an isolated D1 persistence directory.
// SPENDLY_TEST_URL=http://127.0.0.1:5187 npm test
const base = process.env.SPENDLY_TEST_URL;

test("Worker persists paired transfers, validates input, and deletes both legs", { skip: !base }, async () => {
  assert.ok(base && ["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Integration tests require a local Worker");
  const initial = await fetch(base);
  assert.equal(initial.status, 200);
  await initial.text();
  const payload = {
    id: crypto.randomUUID(), type: "transfer", amount: 125000,
    description: "Integration transfer", category: "Chuyển tiền",
    account: "Vietcombank", toAccount: "MoMo", note: "Test persisted note",
    date: "2026-10-07T08:00:00+07:00",
  };
  const post = (data: unknown) => fetch(`${base}/api/transactions`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data),
  });
  assert.equal((await post({ ...payload, toAccount: payload.account })).status, 400);
  assert.equal((await post({ ...payload, date: "invalid-date" })).status, 400);
  assert.equal((await post({ ...payload, toAccount: "Missing account" })).status, 400);
  assert.equal((await post({ ...payload, type: "expense", category: "Lương" })).status, 400);
  const response = await post(payload);
  assert.equal(response.status, 201, await response.clone().text());
  const { transactions } = await response.json() as { transactions: { id: string; transferId: string; transferDirection: string; note: string }[] };
  try {
    assert.equal(transactions.length, 2);
    assert.deepEqual(transactions.map(row => row.transferDirection), ["out", "in"]);
    assert.equal(transactions[0].transferId, transactions[1].transferId);
    assert.ok(transactions.every(row => row.note === payload.note));
    assert.equal((await post(payload)).status, 409);
    const html = await (await fetch(base)).text();
    for (const row of transactions) assert.ok(html.includes(row.id), "Persisted transfer leg must survive reload");
    const renderedText = html.replace(/<[^>]*>/g, "");
    assert.ok(renderedText.includes("Chuyển tiền · MoMo"), "Joined category and account names must not collide in D1 batch results");
    assert.ok(renderedText.includes("Chuyển tiền · Vietcombank"));
    const removed = await fetch(`${base}/api/transactions?id=${transactions[1].id}`, { method: "DELETE" });
    assert.equal(removed.status, 200);
    const afterDelete = await (await fetch(base)).text();
    for (const row of transactions) assert.ok(!afterDelete.includes(row.id), "Deleting either leg removes the pair");
  } finally {
    await fetch(`${base}/api/transactions?id=${payload.id}`, { method: "DELETE" });
  }
});

test("Worker rejects malformed receipt uploads without a server error", { skip: !base }, async () => {
  assert.ok(base && ["127.0.0.1", "localhost"].includes(new URL(base).hostname));
  const response = await fetch(`${base}/api/receipts`, { method: "POST", body: "not multipart data" });
  assert.equal(response.status, 400);
});
