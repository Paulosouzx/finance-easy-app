-- ============================================================
-- FinanceApp — Novo tipo de transação: "savings" (Fundo de Emergência)
-- ============================================================
-- Antes, uma contribuição para o fundo de emergência só existia
-- indiretamente, como receita/despesa numa categoria do tipo "savings".
-- Agora "savings" passa a ser também um tipo de transação de primeira
-- classe, ao lado de "income" e "expense", sem exigir categoria.
-- ============================================================

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('income', 'expense', 'savings'));
