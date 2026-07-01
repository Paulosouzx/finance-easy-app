# FinanceApp

Aplicação web fullstack de gestão financeira pessoal inspirada no Mobills — dark mode por defeito, tema roxo (#7B2FF7), sidebar com todas as secções.

## Run & Operate

- `pnpm --filter @workspace/finance-app run dev` — run the frontend (path `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Recharts + framer-motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all API shapes)
- `lib/db/src/schema/` — Drizzle table definitions (accounts, categories, creditCards, transactions, bills, budgets, goals)
- `/finance-app/src/` — React frontend (pages/ for each section, App.tsx for routing)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod validation schemas (do not edit)

## Architecture decisions

- OpenAPI-first: all API shapes live in `openapi.yaml`; hooks and Zod schemas are generated via Orval
- Numeric DB columns (balance, amount) use `numeric` (stored as string); always `parseFloat()` before returning to clients
- `date` columns use `mode: "string"` (YYYY-MM-DD) to avoid timezone shifts
- Dashboard endpoints compute aggregates live from the transactions table; no denormalized summary tables
- Body schema names are entity-shaped (`AccountInput`, not `CreateAccountBody`) to avoid Orval TS2308 collisions

## Product

- Dashboard: total balance, monthly income/expenses, open card invoices, cash flow chart, expenses-by-category donut, recent transactions
- Transações: filterable list (type, status, month, category), CRUD, mark paid/pending
- Contas: bank accounts/wallets with balances, CRUD
- Cartões de Crédito: credit card management, current invoice view, limit usage bar
- Contas a Pagar: bills list with overdue detection, pay bill → auto creates transaction
- Orçamentos: monthly budgets per category with green/yellow/red progress
- Metas: savings goals with progress bars and contribution tracking
- Categorias: income/expense categories with icons/colors, custom categories
- Relatórios: evolution charts and category breakdown
- Definições: theme toggle, user profile section

## Gotchas

- After any `openapi.yaml` change, run codegen before touching frontend or backend types
- Do NOT use `CreateNoteBody`-style component names in the OpenAPI spec — Orval generates these names itself and re-exporting causes TS2308
- `getCreditCardInvoice` has no `month` query param (would cause a `GetCreditCardInvoiceParams` name collision); month defaults to current month server-side
- Numeric Drizzle columns return strings from the DB — always `parseFloat()` before sending JSON responses

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
