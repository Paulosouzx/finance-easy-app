-- ============================================================
-- FinanceApp — Novo tipo de categoria: "savings" (Fundo de Emergência)
-- ============================================================
-- Permite marcar uma categoria como poupança/fundo de emergência,
-- para que o dashboard a possa destacar com uma linha própria no
-- gráfico de evolução. Categorias deste tipo continuam disponíveis
-- tanto em transações de despesa como de receita (tal como "both").
-- ============================================================

alter table public.categories drop constraint if exists categories_type_check;
alter table public.categories add constraint categories_type_check
  check (type in ('income', 'expense', 'both', 'savings'));

insert into public.categories (name, icon, color, type, is_system)
select 'Fundo de Emergência', 'PiggyBank', '#F59E0B', 'savings', true
where not exists (
  select 1 from public.categories where is_system = true and name = 'Fundo de Emergência'
);
