-- ============================================================
-- FinanceApp — Perfis dos membros aceites de uma conta partilhada
-- ============================================================
-- profiles_select_own restringe leitura de public.profiles à própria
-- linha, então o stack de avatares da conta partilhada precisa de uma
-- RPC security definer (mesmo padrão de search_profiles /
-- get_pending_invites) para expor nome/avatar dos membros aceites
-- a quem tem acesso à conta (dono ou membro aceite).
-- ============================================================

create or replace function public.get_account_member_profiles(p_account_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  role text,
  invited_email text,
  created_at timestamptz,
  name text,
  username text,
  avatar_url text
)
language sql security definer stable
as $$
  select am.id as member_id, am.user_id, am.role, am.invited_email, am.created_at,
         p.name, p.username, p.avatar_url
  from public.account_members am
  join public.profiles p on p.id = am.user_id
  where am.account_id = p_account_id
    and am.status = 'accepted'
    and (
      exists (
        select 1 from public.accounts a
        where a.id = p_account_id and a.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.account_members me
        where me.account_id = p_account_id and me.user_id = auth.uid() and me.status = 'accepted'
      )
    )
  order by am.created_at asc;
$$;

grant execute on function public.get_account_member_profiles(uuid) to authenticated;
