-- ============================================================
-- FinanceApp — Datas de início/fim para despesas recorrentes
-- ============================================================
-- Contas a pagar recorrentes (semanal/mensal/anual) precisam de saber
-- quando a recorrência começa e, opcionalmente, quando termina.
-- start_date é obrigatório para recorrências != 'once' (validado na app);
-- end_date é opcional — null significa "sem data de fim" (recorrência aberta).
-- ============================================================

alter table public.bills add column if not exists start_date date;
alter table public.bills add column if not exists end_date date;

-- Backfill: para contas já existentes, assume-se que a recorrência
-- começou na própria data de vencimento registada.
update public.bills set start_date = due_date where start_date is null;
