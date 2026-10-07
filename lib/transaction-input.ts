import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().finite().positive().max(1_000_000_000_000),
  description: z.string().trim().min(2).max(160),
  category: z.string().trim().max(80),
  account: z.string().trim().min(1).max(80),
  toAccount: z.string().trim().min(1).max(80).optional(),
  date: z.union([z.string().datetime({ offset: true, local: true }), z.string().date()]),
  note: z.string().trim().max(2000).default(""),
}).superRefine((value, context) => {
  if (value.type === "transfer" && (!value.toAccount || value.toAccount === value.account)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["toAccount"], message: "Chọn tài khoản nhận khác tài khoản chuyển" });
  }
  if (value.type !== "transfer" && !value.category) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["category"], message: "Thiếu danh mục giao dịch" });
  }
});
