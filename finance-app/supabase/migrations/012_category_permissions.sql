-- ============================================================
-- FinanceApp — Permissões de categorias
-- ============================================================
-- 1) O utilizador deve poder editar (nome/ícone/cor/tipo) qualquer
--    categoria, incluindo as categorias do sistema (is_system = true).
--    A eliminação de categorias do sistema continua bloqueada
--    (aplicado em services/categories.ts, não removido aqui).
-- 2) Membros aceites de uma conta partilhada devem poder ver as
--    categorias personalizadas do dono da conta, para poderem
--    escolher a mesma categoria ao lançar transações nessa conta.
-- ============================================================

drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select using (
    is_system = true
    or user_id = auth.uid()
    or exists (
      select 1 from public.account_members am
      join public.accounts a on a.id = am.account_id
      where a.owner_id = categories.user_id
        and am.user_id = auth.uid()
        and am.status = 'accepted'
    )
  );

drop policy if exists "categories_update" on public.categories;
create policy "categories_update" on public.categories
  for update using (
    is_system = true or user_id = auth.uid()
  ) with check (
    is_system = true or user_id = auth.uid()
  );
