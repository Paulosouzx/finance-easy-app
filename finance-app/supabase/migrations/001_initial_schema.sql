-- ============================================================
-- FinanceApp — Schema Supabase
-- Corre este ficheiro no SQL Editor do teu projeto Supabase.
-- https://app.supabase.com > SQL Editor > New query
-- ============================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'Utilizador',
  email       text,
  avatar_url  text,
  theme       text not null default 'dark'
                check (theme in ('light', 'dark', 'green-light', 'green-dark')),
  enabled_modules jsonb not null default
    '["dashboard","transactions","accounts","credit-cards","bills","budgets","goals","categories","reports"]'::jsonb,
  currency    text not null default 'EUR',
  created_at  timestamptz not null default now()
);

-- Trigger: criar perfil automaticamente ao registar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────
-- ACCOUNTS (contas bancárias / carteiras)
-- ──────────────────────────────────────────────
create table public.accounts (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null default 'checking'
                check (type in ('checking', 'savings', 'wallet', 'investment', 'other')),
  institution text,
  balance     numeric(14,2) not null default 0,
  currency    text not null default 'EUR',
  color       text,
  created_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- ACCOUNT_MEMBERS (2º titular / partilha de conta)
-- ──────────────────────────────────────────────
create table public.account_members (
  id            uuid primary key default uuid_generate_v4(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  role          text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  invited_email text not null,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  unique (account_id, invited_email)
);

-- ──────────────────────────────────────────────
-- CATEGORIES
-- ──────────────────────────────────────────────
create table public.categories (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade,  -- null = categoria do sistema
  name       text not null,
  icon       text,
  color      text,
  type       text not null default 'both' check (type in ('income', 'expense', 'both')),
  parent_id  uuid references public.categories(id) on delete set null,
  is_system  boolean not null default false,
  created_at timestamptz not null default now()
);

-- Categorias do sistema (pré-definidas, is_system = true, user_id = null)
insert into public.categories (name, icon, color, type, is_system) values
  ('Alimentação',   'UtensilsCrossed', '#F97316', 'expense', true),
  ('Transporte',    'Car',             '#3B82F6', 'expense', true),
  ('Lazer',         'Music',           '#8B5CF6', 'expense', true),
  ('Saúde',         'Stethoscope',     '#EF4444', 'expense', true),
  ('Casa',          'Home',            '#10B981', 'expense', true),
  ('Educação',      'GraduationCap',   '#F59E0B', 'expense', true),
  ('Roupas',        'Shirt',           '#EC4899', 'expense', true),
  ('Mercado',       'ShoppingCart',    '#06B6D4', 'expense', true),
  ('Salário',       'Briefcase',       '#10B981', 'income',  true),
  ('Investimentos', 'TrendingUp',      '#7B2FF7', 'income',  true);

-- ──────────────────────────────────────────────
-- CREDIT_CARDS
-- ──────────────────────────────────────────────
create table public.credit_cards (
  id            uuid primary key default uuid_generate_v4(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  name          text not null,
  brand         text not null default 'visa' check (brand in ('visa', 'mastercard', 'amex', 'other')),
  credit_limit  numeric(14,2) not null default 0,
  closing_day   int not null check (closing_day between 1 and 31),
  due_day       int not null check (due_day between 1 and 31),
  created_at    timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- TRANSACTIONS
-- ──────────────────────────────────────────────
create table public.transactions (
  id          uuid primary key default uuid_generate_v4(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  created_by  uuid not null references auth.users(id),
  category_id uuid references public.categories(id) on delete set null,
  card_id     uuid references public.credit_cards(id) on delete set null,
  amount      numeric(14,2) not null check (amount > 0),
  type        text not null check (type in ('income', 'expense')),
  description text not null default '',
  date        date not null,
  status      text not null default 'paid' check (status in ('paid', 'pending')),
  recurrence  text not null default 'once' check (recurrence in ('once', 'weekly', 'monthly', 'yearly')),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- Índices úteis
create index on public.transactions (account_id, date desc);
create index on public.transactions (category_id);

-- ──────────────────────────────────────────────
-- BILLS (contas a pagar)
-- ──────────────────────────────────────────────
create table public.bills (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  account_id  uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name        text not null,
  amount      numeric(14,2) not null check (amount > 0),
  due_date    date not null,
  status      text not null default 'pending' check (status in ('paid', 'pending', 'overdue')),
  recurrence  text not null default 'monthly' check (recurrence in ('once', 'weekly', 'monthly', 'yearly')),
  created_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- BUDGETS (orçamentos mensais)
-- ──────────────────────────────────────────────
create table public.budgets (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete cascade,
  month        text not null,  -- formato YYYY-MM
  limit_amount numeric(14,2) not null check (limit_amount > 0),
  created_at   timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- ──────────────────────────────────────────────
-- GOALS (metas de poupança)
-- ──────────────────────────────────────────────
create table public.goals (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  target_amount  numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  deadline       date,
  color          text,
  icon           text,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Ver 002_debt_accounts_and_rls.sql — ativa RLS em todas as tabelas,
-- adiciona o tipo de conta "debt" e as políticas de partilha de conta.
-- Corre sempre esse ficheiro a seguir a este.
-- ============================================================
