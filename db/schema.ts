import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), name: text("name").notNull(), avatarUrl: text("avatar_url"), ...timestamps,
}, (table) => [uniqueIndex("idx_users_email").on(table.email)]);

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank", "wallet", "credit", "investment", "saving"] }).notNull(), initialBalance: real("initial_balance").notNull().default(0),
  currency: text("currency").notNull().default("VND"), color: text("color").notNull().default("#2563eb"), icon: text("icon").notNull().default("wallet"), note: text("note").notNull().default(""),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"), ...timestamps,
}, (table) => [index("idx_accounts_user_status").on(table.userId, table.status)]);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), parentId: text("parent_id"), name: text("name").notNull(),
  kind: text("kind", { enum: ["income", "expense"] }).notNull(), icon: text("icon").notNull(), color: text("color").notNull(), ...timestamps,
}, (table) => [index("idx_categories_user_kind").on(table.userId, table.kind)]);

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), accountId: text("account_id").notNull().references(() => accounts.id),
  categoryId: text("category_id").references(() => categories.id), type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(), amount: real("amount").notNull(),
  description: text("description").notNull(), note: text("note").notNull().default(""), transactionDate: text("transaction_date").notNull(), status: text("status", { enum: ["completed", "pending"] }).notNull().default("completed"),
  transferId: text("transfer_id"), transferDirection: text("transfer_direction", { enum: ["out", "in"] }), isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false), receiptUrl: text("receipt_url"), ...timestamps,
}, (table) => [index("idx_transactions_user_date").on(table.userId, table.transactionDate), index("idx_transactions_user_type").on(table.userId, table.type), index("idx_transactions_transfer").on(table.transferId)]);

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), categoryId: text("category_id").references(() => categories.id),
  name: text("name").notNull(), amount: real("amount").notNull(), period: text("period").notNull(), alertThreshold: integer("alert_threshold").notNull().default(70), ...timestamps,
}, (table) => [index("idx_budgets_user_period").on(table.userId, table.period)]);

export const savingGoals = sqliteTable("saving_goals", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), name: text("name").notNull(), targetAmount: real("target_amount").notNull(),
  deadline: text("deadline").notNull(), icon: text("icon").notNull().default("target"), color: text("color").notNull().default("#8b5cf6"), note: text("note").notNull().default(""), ...timestamps,
}, (table) => [index("idx_goals_user").on(table.userId)]);

export const goalTransactions = sqliteTable("goal_transactions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), goalId: text("goal_id").notNull().references(() => savingGoals.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(), note: text("note").notNull().default(""), transactionDate: text("transaction_date").notNull(), ...timestamps,
}, (table) => [index("idx_goal_transactions_goal_date").on(table.goalId, table.transactionDate)]);

export const recurringTransactions = sqliteTable("recurring_transactions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), accountId: text("account_id").notNull().references(() => accounts.id), categoryId: text("category_id").references(() => categories.id),
  type: text("type", { enum: ["income", "expense"] }).notNull(), amount: real("amount").notNull(), description: text("description").notNull(), frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "yearly", "custom"] }).notNull(),
  interval: integer("interval").notNull().default(1), nextRunAt: text("next_run_at").notNull(), active: integer("active", { mode: "boolean" }).notNull().default(true), ...timestamps,
}, (table) => [index("idx_recurring_user_next").on(table.userId, table.nextRunAt)]);

export const tags = sqliteTable("tags", { id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), name: text("name").notNull(), color: text("color").notNull() },
  (table) => [uniqueIndex("idx_tags_user_name").on(table.userId, table.name)]);

export const transactionTags = sqliteTable("transaction_tags", {
  transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }), tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("idx_transaction_tags_pair").on(table.transactionId, table.tagId)]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), type: text("type").notNull(), title: text("title").notNull(), message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_notifications_user_read").on(table.userId, table.read)]);

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }), currency: text("currency").notNull().default("VND"), language: text("language").notNull().default("vi"),
  theme: text("theme", { enum: ["light", "dark", "system"] }).notNull().default("system"), firstDayOfWeek: integer("first_day_of_week").notNull().default(1), dateFormat: text("date_format").notNull().default("dd/MM/yyyy"),
  monthlyStartingDay: integer("monthly_starting_day").notNull().default(1), budgetAlertPercentage: integer("budget_alert_percentage").notNull().default(70), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
