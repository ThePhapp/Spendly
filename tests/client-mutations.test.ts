import assert from "node:assert/strict";
import test from "node:test";
import { createTransactionMutations } from "../features/transactions/mutations";
import type { Transaction } from "../features/finance/types";

const row = (id: string): Transaction => ({ id, type: "expense", amount: 100, description: "Lunch", category: "Ăn uống", account: "Vietcombank", date: "2026-10-07T00:00:00.000Z", color: "#f59e0b" });
function fixture(initial: Transaction[] = []) {
  let items = initial;
  const requests: { url: string; init?: RequestInit; resolve: (response: Response) => void; reject: (error: Error) => void }[] = [];
  const fetcher: typeof fetch = (url, init) => new Promise<Response>((resolve, reject) => requests.push({ url: String(url), init, resolve, reject }));
  const mutations = createTransactionMutations(update => { items = update(items); }, fetcher);
  return { mutations, requests, items: () => items };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const success = (transactions: Transaction[]) => Response.json({ ok: true, transactions });

test("creates wait for confirmation, coalesce double submits, and use authoritative server rows", async () => {
  const f = fixture();
  const pending = f.mutations.create(row("a"));
  assert.equal(f.mutations.create(row("a")), pending);
  await tick();
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.items(), []);
  const saved = { ...row("a"), description: "Server description", note: "Preserved note" };
  f.requests[0].resolve(success([saved]));
  await pending;
  assert.deepEqual(f.items(), [saved]);
});

test("HTTP and network failures leave state intact and allow retry", async () => {
  const f = fixture([row("original")]);
  for (const mode of ["http", "network"]) {
    const pending = f.mutations.create(row("a"));
    const rejected = assert.rejects(pending);
    await tick();
    if (mode === "http") f.requests.at(-1)!.resolve(new Response(null, { status: 500 }));
    else f.requests.at(-1)!.reject(new Error("offline"));
    await rejected;
    assert.deepEqual(f.items(), [row("original")]);
  }
  const retry = f.mutations.create(row("a"));
  await tick();
  f.requests.at(-1)!.resolve(success([row("a")]));
  await retry;
  assert.equal(f.items().length, 2);
});

test("failed deletion cannot undo a concurrent create or successful delete", async () => {
  const f = fixture([row("a"), row("b")]);
  const failed = f.mutations.remove("a");
  const rejected = assert.rejects(failed);
  const removed = f.mutations.remove("b");
  const created = f.mutations.create(row("c"));
  await tick();
  f.requests[2].resolve(success([row("c")]));
  f.requests[1].resolve(Response.json({ ok: true }));
  await Promise.all([created, removed]);
  f.requests[0].resolve(new Response(null, { status: 500 }));
  await rejected;
  assert.deepEqual(f.items().map(item => item.id), ["c", "a"]);
});

test("transfer responses add both legs and deleting either leg removes the pair", async () => {
  const f = fixture([row("unrelated")]);
  const create = f.mutations.create({ ...row("out"), type: "transfer", toAccount: "MoMo" });
  await tick();
  f.requests[0].resolve(Response.json({ transactions: [
    { ...row("out"), type: "transfer", transferId: "pair", transferDirection: "out", toAccount: "MoMo" },
    { ...row("in"), type: "transfer", transferId: "pair", transferDirection: "in", account: "MoMo", toAccount: "Vietcombank" },
  ] }));
  await create;
  assert.deepEqual(f.items().slice(0, 2).map(item => item.transferDirection), ["out", "in"]);
  const remove = f.mutations.remove("in");
  assert.equal(f.mutations.remove("in"), remove);
  await tick();
  f.requests[1].resolve(Response.json({ ok: true }));
  await remove;
  assert.deepEqual(f.items(), [row("unrelated")]);
});

test("delete waits for an in-flight create before sending its request", async () => {
  const f = fixture();
  const create = f.mutations.create(row("a"));
  const remove = f.mutations.remove("a");
  await tick();
  assert.equal(f.requests.length, 1);
  f.requests[0].resolve(success([row("a")]));
  await create;
  await tick();
  assert.equal(f.requests[1].init?.method, "DELETE");
  f.requests[1].resolve(Response.json({ ok: true }));
  await remove;
  assert.deepEqual(f.items(), []);
});
