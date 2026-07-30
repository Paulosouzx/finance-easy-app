-- ============================================================
-- FinanceApp — Username + pesquisa de utilizadores para convites
-- ============================================================

-- ──────────────────────────────────────────────
-- USERNAME — coluna nova em profiles, gerada a partir do email
-- ──────────────────────────────────────────────
alter table public.profiles add column if not exists username text;

update public.profiles p
set username = dup.base || case when dup.rn > 1 then dup.rn::text else '' end
from (
  select id, lower(regexp_replace(split_part(email, '@', 1), '[^a-z0-9_]', '', 'g')) as base,
         row_number() over (
           partition by lower(regexp_replace(split_part(email, '@', 1), '[^a-z0-9_]', '', 'g'))
           order by created_at
         ) as rn
  from public.profiles
) dup
where p.id = dup.id and p.username is null;

alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_key on public.profiles (username);

-- Gera username por omissão para novos utilizadores
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  candidate text;
  suffix int := 0;
begin
  candidate := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if candidate = '' then
    candidate := 'user';
  end if;
  while exists (select 1 from public.profiles where username = candidate || case when suffix > 0 then suffix::text else '' end) loop
    suffix := suffix + 1;
  end loop;

  insert into public.profiles (id, name, email, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    candidate || case when suffix > 0 then suffix::text else '' end
  );
  return new;
end;
$$;

-- ──────────────────────────────────────────────
-- RPC de pesquisa — devolve só campos públicos, nunca a tabela toda
-- ──────────────────────────────────────────────
create or replace function public.search_profiles(search_query text)
returns table (id uuid, name text, username text, email text, avatar_url text)
language sql security definer stable
as $$
  select p.id, p.name, p.username, p.email, p.avatar_url
  from public.profiles p
  where p.id <> auth.uid()
    and length(trim(search_query)) >= 2
    and (
      p.name ilike '%' || search_query || '%'
      or p.username ilike '%' || search_query || '%'
      or p.email ilike '%' || search_query || '%'
    )
  order by p.name
  limit 8;
$$;

grant execute on function public.search_profiles(text) to authenticated;

-- ──────────────────────────────────────────────
-- ACCOUNT_MEMBERS — permite ver convites também pelo user_id
-- (antes só filtrava por invited_email do utilizador autenticado)
-- ──────────────────────────────────────────────
-- (a policy account_members_select já cobre user_id = auth.uid(), nada a mudar aqui)
