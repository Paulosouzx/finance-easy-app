# FinanceApp

Aplicação web de gestão financeira pessoal inspirada no Mobills — dark mode por defeito, tema roxo (#7B2FF7), sidebar com todas as secções. Autenticação e dados 100% em Supabase (sem backend próprio).

## Run & Operate

- `pnpm --filter @workspace/finance-app run dev` — corre o frontend (`http://localhost:5173`)
- `pnpm run typecheck` — typecheck de todos os pacotes do workspace
- `pnpm run build` — typecheck + build
- Ver `SETUP.md` para criar o projeto Supabase, correr as migrations e configurar o `.env`

## Stack

- pnpm workspaces, Node.js ≥ 18, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + shadcn/ui + Recharts + framer-motion
- Backend: Supabase (Postgres + Auth + Row Level Security + Realtime) — sem servidor próprio
- Auth: email/password e Google OAuth via Supabase Auth

## Where things live

- `/finance-app/src/` — React frontend (`pages/` por secção, `App.tsx` para routing)
- `/finance-app/src/lib/supabase.ts` — cliente Supabase (lê `.env`)
- `/finance-app/src/lib/supabase.types.ts` — tipos TypeScript da base de dados
- `/finance-app/src/services/` — queries diretas ao Supabase (accounts, transactions, credit cards, bills, budgets, goals, categories, profile)
- `/finance-app/src/contexts/auth.tsx` — sessão, sign in/up, Google OAuth, sign out
- `/finance-app/supabase/migrations/` — schema SQL + Row Level Security

## Architecture decisions

- Sem API própria: o frontend fala diretamente com o Supabase (PostgREST) através do `supabase-js`; a autorização vive nas políticas de Row Level Security, não em código de servidor
- `numeric` (balance, amount) chega como `number` via os tipos gerados; usa sempre `Number(...)` antes de formatar
- `date` guarda-se em formato `YYYY-MM-DD` (string) para evitar problemas de fuso horário
- Contas partilhadas: `account_members` liga um 2º utilizador (por email) a uma conta existente; as políticas RLS dão acesso a `accounts`/`credit_cards`/`transactions` ao dono e a membros com `status = 'accepted'`
- `bills`, `budgets` e `goals` são sempre pessoais (por `user_id`), não são partilháveis via `account_members`

## Product

- Dashboard: saldo total, receitas/despesas do mês, faturas de cartão em aberto, gráfico de cash flow, despesas por categoria, transações recentes
- Transações: lista filtrável (tipo, estado, mês, categoria), CRUD, marcar paga/pendente
- Contas: contas bancárias/carteiras/dívidas com saldo, CRUD, partilha com um 2º utilizador (convite por email)
- Cartões de Crédito: gestão de cartões, fatura atual, barra de utilização do limite
- Contas a Pagar: lista com deteção de atraso, pagar conta → cria transação automaticamente
- Orçamentos: orçamentos mensais por categoria com progresso verde/amarelo/vermelho
- Metas: metas de poupança com barra de progresso e contribuições
- Categorias: categorias de receita/despesa com ícones/cores, categorias personalizadas
- Relatórios: evolução mensal e distribuição por categoria
- Definições: perfil, tema, módulos ativos, terminar sessão

## Partilha de contas (2º utilizador)

1. Na página **Contas**, clica em **Partilhar** numa conta (pensado sobretudo para contas do tipo "Dívida")
2. Introduz o email da pessoa a convidar — cria uma linha `pending` em `account_members`
3. Quando essa pessoa entra na app com o mesmo email, vê o convite no sino de notificações e pode aceitar/recusar
4. Ao aceitar, `account_members.user_id` passa a apontar para o novo utilizador e as políticas RLS passam a dar-lhe acesso de leitura/escrita à conta, cartões e transações associadas

## Gotchas

- Row Level Security está sempre ativo (ver `002_debt_accounts_and_rls.sql`) — qualquer query nova a uma tabela existente deve continuar a respeitar as políticas, não confiar em filtros feitos só no cliente
- `getAccounts`/`getTransactions`/`getCreditCards` não filtram por `owner_id` no cliente — a RLS é que decide o que é visível (dono ou membro aceite)
- Depois de mudar `supabase.types.ts`, mantém sempre `Relationships`/`Views`/`Functions`/`Enums` no formato do Supabase (`supabase gen types typescript`), senão o `createClient<Database>` deixa de inferir os tipos de insert/update

## Pointers

- Ver `SETUP.md` para o guia completo de setup do Supabase (schema, RLS, Google OAuth, Realtime, deploy)
