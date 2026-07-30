-- ============================================================
-- FinanceApp — Nome da conta em convites pendentes, sem vazar dados
-- ============================================================
-- Tentativa inicial foi alargar accounts_select para incluir membros
-- "pending", mas isso vazava saldo/detalhes da conta na página /accounts
-- antes do convidado aceitar. Correção: manter accounts_select restrita
-- a owner/accepted, e expor nome+tipo da conta pendente só via RPC
-- security definer dedicada.
-- ============================================================

create or replace function public.get_pending_invites()
returns table (
  id uuid,
  account_id uuid,
  role text,
  invited_email text,
  status text,
  created_at timestamptz,
  account_name text,
  account_type text
)
language sql security definer stable
as $$
  select am.id, am.account_id, am.role, am.invited_email, am.status, am.created_at,
         a.name as account_name, a.type as account_type
  from public.account_members am
  join public.accounts a on a.id = am.account_id
  where am.invited_email = (auth.jwt() ->> 'email')
    and am.status = 'pending';
$$;

grant execute on function public.get_pending_invites() to authenticated;
