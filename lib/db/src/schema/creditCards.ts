import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creditCardsTable = pgTable("credit_cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  limit: numeric("limit_amount", { precision: 12, scale: 2 }).notNull(),
  closingDay: integer("closing_day").notNull(),
  dueDay: integer("due_day").notNull(),
  accountId: integer("account_id"),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCreditCardSchema = createInsertSchema(creditCardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreditCard = z.infer<typeof insertCreditCardSchema>;
export type CreditCard = typeof creditCardsTable.$inferSelect;
