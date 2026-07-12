-- ============================================================
-- FinanceApp — Contas de Dívida + Row Level Security
-- Corre este ficheiro no SQL Editor do teu projeto Supabase,
-- depois de teres corrido o 001_initial_schema.sql.
-- ============================================================

-- ──────────────────────────────────────────────
-- Novo tipo de conta: "debt" (dívida / conta partilhada)
-- ──────────────────────────────────────────────
alter table public.accounts drop constraint if exists accounts_type_check;
alter table public.accounts add constraint accounts_type_check
  check (type in ('checking', 'savings', 'wallet', 'investment', 'debt', 'other'));

-- ──────────────────────────────────────────────
-- Impede que um membro convidado (não-owner) altere o dono da conta
-- ──────────────────────────────────────────────
create or replace function public.prevent_account_owner_change()
returns trigger language plpgsql as $$
begin
  if new.owner_id <> old.owner_id and auth.uid() <> old.owner_id then
    raise exception 'Apenas o dono da conta pode transferir a propriedade';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_account_owner_change on public.accounts;
create trigger trg_prevent_account_owner_change
  before update on public.accounts
  for each row execute function public.prevent_account_owner_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ──────────────────────────────────────────────
-- PROFILES — cada utilizador vê e edita apenas o seu perfil
-- ──────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ──────────────────────────────────────────────
-- ACCOUNTS — dono ou membro aceite (partilha de conta / dívida)
-- ──────────────────────────────────────────────
alter table public.accounts enable row level security;

drop policy if exists "accounts_select" on public.accounts;
create policy "accounts_select" on public.accounts
  for select using (
    auth.uid() = owner_id or
    exists (
      select 1 from public.account_members am
      where am.account_id = accounts.id
        and am.user_id = auth.uid()
        and am.status = 'accepted'
    )
  );

drop policy if exists "accounts_insert" on public.accounts;
create policy "accounts_insert" on public.accounts
  for insert with check (auth.uid() = owner_id);

drop policy if exists "accounts_update" on public.accounts;
create policy "accounts_update" on public.accounts
  for update using (
    auth.uid() = owner_id or
    exists (
      select 1 from public.account_members am
      where am.account_id = accounts.id
        and am.user_id = auth.uid()
        and am.status = 'accepted'
    )
  );

drop policy if exists "accounts_delete" on public.accounts;
create policy "accounts_delete" on public.accounts
  for delete using (auth.uid() = owner_id);

-- ──────────────────────────────────────────────
-- ACCOUNT_MEMBERS — convites de 2º utilizador para gerir a conta
-- ──────────────────────────────────────────────
alter table public.account_members enable row level security;

-- Visível ao dono da conta, ao próprio membro, ou a quem foi convidado por email
drop policy if exists "account_members_select" on public.account_members;
create policy "account_members_select" on public.account_members
  for select using (
    exists (
      select 1 from public.accounts a
      where a.id = account_members.account_id and a.owner_id = auth.uid()
    )
    or user_id = auth.uid()
    or invited_email = (auth.jwt() ->> 'email')
  );

-- Apenas o dono da conta pode convidar (criar) membros
drop policy if exists "account_members_insert" on public.account_members;
create policy "account_members_insert" on public.account_members
  for insert with check (
    exists (
      select 1 from public.accounts a
      where a.id = account_members.account_id and a.owner_id = auth.uid()
    )
  );

-- O dono pode editar qualquer membro; o convidado só pode aceitar/recusar o seu próprio convite
drop policy if exists "account_members_update" on public.account_members;
create policy "account_members_update" on public.account_members
  for update using (
    exists (
      select 1 from public.accounts a
      where a.id = account_members.account_id and a.owner_id = auth.uid()
    )
    or invited_email = (auth.jwt() ->> 'email')
  ) with check (
    exists (
      select 1 from public.accounts a
      where a.id = account_members.account_id and a.owner_id = auth.uid()
    )
    or (invited_email = (auth.jwt() ->> 'email') and (user_id is null or user_id = auth.uid()))
  );

-- O dono pode remover qualquer membro; um membro pode remover-se a si próprio
drop policy if exists "account_members_delete" on public.account_members;
create policy "account_members_delete" on public.account_members
  for delete using (
    exists (
      select 1 from public.accounts a
      where a.id = account_members.account_id and a.owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

-- ──────────────────────────────────────────────
-- CATEGORIES — sistema visível a todos, custom apenas ao dono
-- ──────────────────────────────────────────────
alter table public.categories enable row level security;

drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select using (is_system = true or user_id = auth.uid());

drop policy if exists "categories_insert" on public.categories;
create policy "categories_insert" on public.categories
  for insert with check (user_id = auth.uid() and is_system = false);

drop policy if exists "categories_update" on public.categories;
create policy "categories_update" on public.categories
  for update using (user_id = auth.uid() and is_system = false)
  with check (user_id = auth.uid() and is_system = false);

drop policy if exists "categories_delete" on public.categories;
create policy "categories_delete" on public.categories
  for delete using (user_id = auth.uid() and is_system = false);

-- ──────────────────────────────────────────────
-- CREDIT_CARDS — visíveis/geríveis via conta (dono ou membro aceite)
-- ──────────────────────────────────────────────
alter table public.credit_cards enable row level security;

drop policy if exists "credit_cards_all" on public.credit_cards;
create policy "credit_cards_all" on public.credit_cards
  for all using (
    exists (
      select 1 from public.accounts a
      where a.id = credit_cards.account_id and (
        a.owner_id = auth.uid() or
        exists (select 1 from public.account_members am
          where am.account_id = a.id and am.user_id = auth.uid() and am.status = 'accepted')
      )
    )
  ) with check (
    exists (
      select 1 from public.accounts a
      where a.id = credit_cards.account_id and (
        a.owner_id = auth.uid() or
        exists (select 1 from public.account_members am
          where am.account_id = a.id and am.user_id = auth.uid() and am.status = 'accepted')
      )
    )
  );

-- ──────────────────────────────────────────────
-- TRANSACTIONS — visíveis/geríveis via conta (dono ou membro aceite)
-- ──────────────────────────────────────────────
alter table public.transactions enable row level security;

drop policy if exists "transactions_all" on public.transactions;
create policy "transactions_all" on public.transactions
  for all using (
    exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id and (
        a.owner_id = auth.uid() or
        exists (select 1 from public.account_members am
          where am.account_id = a.id and am.user_id = auth.uid() and am.status = 'accepted')
      )
    )
  ) with check (
    exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id and (
        a.owner_id = auth.uid() or
        exists (select 1 from public.account_members am
          where am.account_id = a.id and am.user_id = auth.uid() and am.status = 'accepted')
      )
    )
  );

-- ──────────────────────────────────────────────
-- BILLS / BUDGETS / GOALS — pessoais (não partilhados)
-- ──────────────────────────────────────────────
alter table public.bills enable row level security;

drop policy if exists "bills_all" on public.bills;
create policy "bills_all" on public.bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.budgets enable row level security;

drop policy if exists "budgets_all" on public.budgets;
create policy "budgets_all" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.goals enable row level security;

drop policy if exists "goals_all" on public.goals;
create policy "goals_all" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Realtime (ativar também no painel: Database > Replication)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'accounts'
  ) then
    alter publication supabase_realtime add table public.accounts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'account_members'
  ) then
    alter publication supabase_realtime add table public.account_members;
  end if;
end $$;
