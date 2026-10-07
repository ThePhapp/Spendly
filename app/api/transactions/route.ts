import { and, eq } from "drizzle-orm";
import { getAppUser } from "@/app/auth";
import { getDb } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { transactionSchema } from "@/lib/transaction-input";

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dữ liệu giao dịch không hợp lệ", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const data = parsed.data;
  const [account] = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, user.userId), eq(accounts.name, data.account), eq(accounts.status, "active"))).limit(1);
  if (!account) return Response.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  const base = {
    id: data.id,
    userId: user.userId,
    accountId: account.id,
    type: data.type,
    amount: data.amount,
    description: data.description,
    note: data.note,
    transactionDate: data.date,
  };
  let rows: (typeof transactions.$inferInsert)[];
  if (data.type === "transfer") {
    const [destination] = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, user.userId), eq(accounts.name, data.toAccount!), eq(accounts.status, "active"))).limit(1);
    if (!destination || destination.id === account.id) return Response.json({ error: "Tài khoản nhận không hợp lệ" }, { status: 400 });
    const transferId = crypto.randomUUID();
    rows = [
      { ...base, transferId, transferDirection: "out" },
      { ...base, id: crypto.randomUUID(), accountId: destination.id, transferId, transferDirection: "in" },
    ];
  } else {
    const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.userId, user.userId), eq(categories.name, data.category), eq(categories.kind, data.type))).limit(1);
    if (!category) return Response.json({ error: "Danh mục không phù hợp với loại giao dịch" }, { status: 400 });
    rows = [{ ...base, categoryId: category.id }];
  }
  // One INSERT keeps both transfer legs atomic. A duplicate ID must never
  // create a second incoming leg when a client retries the same request.
  try {
    await db.insert(transactions).values(rows);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed: transactions\.id/.test(`${error.message} ${error.cause}`)) {
      return Response.json({ error: "Mã giao dịch đã tồn tại" }, { status: 409 });
    }
    throw error;
  }
  return Response.json({ ok: true, id: data.id, transactions: rows.map((row) => ({
    id: row.id, type: row.type, amount: row.amount, description: row.description,
    account: row.transferDirection === "in" ? data.toAccount : data.account,
    toAccount: row.transferDirection === "in" ? data.account : data.toAccount,
    category: data.type === "transfer" ? "Chuyển tiền" : data.category,
    date: row.transactionDate, note: row.note, status: "completed",
    color: data.type === "income" ? "#22c55e" : data.type === "transfer" ? "#2563eb" : "#f59e0b",
    transferId: row.transferId, transferDirection: row.transferDirection,
  })) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Thiếu mã giao dịch" }, { status: 400 });

  const db = getDb();
  const [transaction] = await db.select({ transferId: transactions.transferId }).from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.userId))).limit(1);
  if (!transaction) return Response.json({ error: "Không tìm thấy giao dịch" }, { status: 404 });
  await db.delete(transactions).where(and(eq(transactions.userId, user.userId), transaction.transferId
    ? eq(transactions.transferId, transaction.transferId)
    : eq(transactions.id, id)));
  return Response.json({ ok: true });
}
