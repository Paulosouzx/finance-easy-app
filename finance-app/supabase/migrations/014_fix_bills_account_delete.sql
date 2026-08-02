-- ============================================================
-- FinanceApp — Permitir eliminar conta com contas a pagar associadas
-- ============================================================
-- transactions.account_id, account_members.account_id e credit_cards.account_id
-- já eliminam em cascata quando a conta é apagada. bills.account_id ficou com
-- "NO ACTION" (bloqueia a eliminação da conta se houver alguma conta a pagar
-- associada), o que fazia a eliminação falhar silenciosamente e parecer um
-- problema de permissões. Como o campo é opcional ("Conta associada"), o
-- comportamento correto é desassociar (SET NULL) em vez de bloquear.
-- ============================================================

alter table public.bills drop constraint if exists bills_account_id_fkey;
alter table public.bills
  add constraint bills_account_id_fkey
  foreign key (account_id) references public.accounts(id) on delete set null;
