-- ============================================================
-- FinanceApp — Idioma da interface (PT/EN)
-- ============================================================
-- Mesma lógica de persistência do tema: guardado no perfil,
-- sincronizado entre dispositivos.
-- ============================================================

alter table public.profiles add column if not exists language text not null default 'pt' check (language in ('pt','en'));
