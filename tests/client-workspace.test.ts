import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { drizzle } from "drizzle-orm/d1";
import { initializeWorkspace } from "../services/workspace-initialization";
import * as schema from "../db/schema";

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../drizzle/0000_free_strong_guy.sql", import.meta.url), "utf8"));
  let failAt = -1;
  let batchCount = 0;
  const client = {
    prepare(sql: string) {
      return { bind: (...params: SQLInputValue[]) => ({
        sql, params,
        async raw() { return sqlite.prepare(sql).all(...params).map(row => Object.values(row)); },
      }) };
    },
    async batch(statements: { sql: string; params: SQLInputValue[] }[]) {
      batchCount++;
      sqlite.exec("BEGIN");
      try {
        statements.forEach((statement, index) => {
          if (index === failAt) throw new Error("injected batch failure");
          assert.doesNotMatch(statement.sql, /union\s+all/i, "D1 limits compound SELECT terms");
          assert.ok(statement.params.length <= 100, "D1 bound parameter limit");
          sqlite.prepare(statement.sql).run(...statement.params);
        });
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
      return [];
    },
  };
  const db = drizzle(client as unknown as D1Database, { schema });
  const user = { userId: "test-user", email: "test@example.com", displayName: "Test", fullName: null, isDemo: true };
  const count = (table: string) => Number(sqlite.prepare(`select count(*) as count from ${table}`).get()?.count);
  return { sqlite, db, user, count, fail: (index: number) => { failAt = index; }, batches: () => batchCount };
}

test("demo initialization is one batch and deleted seed transactions stay deleted on concurrent reloads", async () => {
  const f = fixture();
  try {
    await initializeWorkspace(f.db, f.user);
    assert.equal(f.batches(), 1);
    assert.equal(f.count("transactions"), 18);
    f.sqlite.prepare("delete from transactions where id = ?").run("test-user:t1");
    await Promise.all([initializeWorkspace(f.db, f.user), initializeWorkspace(f.db, f.user)]);
    assert.equal(f.batches(), 1, "initialized reloads must skip every write");
    assert.equal(f.count("transactions"), 17);
    assert.equal(f.count("accounts"), 4);
    assert.equal(f.count("user_settings"), 1);
  } finally { f.sqlite.close(); }
});

test("concurrent first loads create one consistent seed set", async () => {
  const f = fixture();
  try {
    await Promise.all([initializeWorkspace(f.db, f.user), initializeWorkspace(f.db, f.user)]);
    assert.equal(f.count("transactions"), 18);
    assert.equal(f.count("accounts"), 4);
    assert.equal(f.count("user_settings"), 1);
  } finally { f.sqlite.close(); }
});

test("real users receive default accounts/categories with zero balances and no fictional finances", async () => {
  const f = fixture();
  try {
    await initializeWorkspace(f.db, { ...f.user, isDemo: false });
    assert.equal(f.count("accounts"), 4);
    assert.equal(f.count("categories"), 8);
    assert.equal(f.sqlite.prepare("select sum(initial_balance) as balance from accounts").get()?.balance, 0);
    for (const table of ["transactions", "budgets", "saving_goals", "goal_transactions", "recurring_transactions"]) {
      assert.equal(f.count(table), 0, table);
    }
  } finally { f.sqlite.close(); }
});

test("failed initialization rolls back all seeds and marker, and can be retried", async () => {
  const f = fixture();
  try {
    f.fail(5);
    await assert.rejects(initializeWorkspace(f.db, f.user), /injected/);
    for (const table of ["users", "accounts", "categories", "transactions", "user_settings"]) assert.equal(f.count(table), 0);
    f.fail(-1);
    await initializeWorkspace(f.db, f.user);
    assert.equal(f.count("transactions"), 18);
    assert.equal(f.count("user_settings"), 1);
  } finally { f.sqlite.close(); }
});

test("an existing settings marker preserves deletions and user-edited balances", async () => {
  const f = fixture();
  try {
    await initializeWorkspace(f.db, f.user);
    f.sqlite.exec("delete from transactions; update accounts set initial_balance = 42;");
    await initializeWorkspace(f.db, { ...f.user, isDemo: false });
    assert.equal(f.count("transactions"), 0);
    assert.equal(f.sqlite.prepare("select sum(initial_balance) as balance from accounts").get()?.balance, 168);
  } finally { f.sqlite.close(); }
});
