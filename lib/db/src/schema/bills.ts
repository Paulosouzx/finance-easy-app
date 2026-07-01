import { pgTable, text, serial, timestamp, integer, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const billStatusEnum = pgEnum("bill_status", ["paid", "pending", "overdue"]);
export const billRecurrenceEnum = pgEnum("bill_recurrence", ["once", "weekly", "monthly", "yearly"]);

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  status: billStatusEnum("status").notNull().default("pending"),
  categoryId: integer("category_id"),
  recurrence: billRecurrenceEnum("recurrence").notNull().default("monthly"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBillSchema = createInsertSchema(billsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof billsTable.$inferSelect;
