import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Utilizador"),
  email: text("email"),
  theme: text("theme").notNull().default("dark"),
  enabledModules: jsonb("enabled_modules")
    .notNull()
    .$type<string[]>()
    .default(["dashboard", "transactions", "accounts", "credit-cards", "bills", "budgets", "goals", "categories", "reports"]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
