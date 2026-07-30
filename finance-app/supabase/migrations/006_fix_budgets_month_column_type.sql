-- ============================================================
-- FinanceApp — Corrige tipo da coluna budgets.month
-- ============================================================
-- 001_initial_schema.sql define month como `text` (formato "YYYY-MM"),
-- mas a coluna viva na base estava como `date`. Todo o código
-- (services/budgets.ts, pages/budgets.tsx) compara com strings tipo
-- "2026-07", o que causava erro 400 "invalid input syntax for type
-- date" em toda leitura/escrita de orçamentos — a página de
-- Orçamentos nunca mostrava dados, mesmo depois de criar um.
-- ============================================================

alter table public.budgets alter column month type text using to_char(month, 'YYYY-MM');
