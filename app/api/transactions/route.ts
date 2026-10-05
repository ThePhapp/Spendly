import { z } from "zod";
import { getAppUser } from "@/app/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const transactionSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive().max(1_000_000_000_000),
  description: z.string().trim().min(2).max(160),
  category: z.string().max(80),
  account: z.string().max(80),
  date: z.string().datetime({ offset: true }).or(z.string().datetime()),
});

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dữ liệu giao dịch không hợp lệ", issues: parsed.error.flatten() }, { status: 400 });
  if (!isSupabaseConfigured()) return Response.json({ ok: true, id: parsed.data.id, demo: true }, { status: 201 });

  const supabase = await createClient();
  const [accountResult, categoryResult] = await Promise.all([
    supabase.from("accounts").select("id").eq("user_id", user.userId).eq("name", parsed.data.account).maybeSingle(),
    supabase.from("categories").select("id").eq("user_id", user.userId).eq("name", parsed.data.category).maybeSingle(),
  ]);
  if (accountResult.error) return Response.json({ error: accountResult.error.message }, { status: 500 });
  if (categoryResult.error) return Response.json({ error: categoryResult.error.message }, { status: 500 });
  if (!accountResult.data) return Response.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

  const { error } = await supabase.from("transactions").insert({ id: parsed.data.id, user_id: user.userId, account_id: accountResult.data.id, category_id: categoryResult.data?.id ?? null, type: parsed.data.type, amount: parsed.data.amount, description: parsed.data.description, transaction_date: parsed.data.date });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: parsed.data.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Thiếu mã giao dịch" }, { status: 400 });
  if (!isSupabaseConfigured()) return Response.json({ ok: true, demo: true });

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
