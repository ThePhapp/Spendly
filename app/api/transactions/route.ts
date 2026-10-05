import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAppUser } from "@/app/auth";
import { getDb } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";

const transactionSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive().max(1_000_000_000_000),
  description: z.string().trim().min(2).max(160),
  category: z.string().max(80),
  account: z.string().max(80),
  date: z.string().min(8).max(40),
});

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dữ liệu giao dịch không hợp lệ", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [account] = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, user.userId), eq(accounts.name, parsed.data.account))).limit(1);
  const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.userId, user.userId), eq(categories.name, parsed.data.category))).limit(1);
  if (!account) return Response.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

  await db.insert(transactions).values({
    id: parsed.data.id,
    userId: user.userId,
    accountId: account.id,
    categoryId: category?.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    description: parsed.data.description,
    transactionDate: parsed.data.date,
  });
  return Response.json({ ok: true, id: parsed.data.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Thiếu mã giao dịch" }, { status: 400 });

  await getDb().delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.userId)));
  return Response.json({ ok: true });
}
