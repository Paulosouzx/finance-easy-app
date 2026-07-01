import { pgTable, text, serial, timestamp, integer, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["paid", "pending"]);
export const recurrenceEnum = pgEnum("recurrence", ["once", "weekly", "monthly", "yearly"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  description: text("description"),
  status: transactionStatusEnum("status").notNull().default("paid"),
  recurrence: recurrenceEnum("recurrence").notNull().default("once"),
  accountId: integer("account_id").notNull(),
  categoryId: integer("category_id"),
  creditCardId: integer("credit_card_id"),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
