-- ============================================================
-- FinanceApp — Corrige DEFAULT de enabled_modules
-- ============================================================
-- O DEFAULT vivo na base tinha ficado só com 3 módulos
-- (dashboard, transactions, accounts), diferente dos 9 módulos
-- pretendidos em 001_initial_schema.sql. Resultado: todo utilizador
-- novo ficava sem Bills/Budgets/Metas/Categorias/Relatórios/Cartões
-- no menu lateral, sem saber que existiam ("botão que não abre").
-- ============================================================

alter table public.profiles alter column enabled_modules
  set default '["dashboard","transactions","accounts","credit-cards","bills","budgets","goals","categories","reports"]'::jsonb;
