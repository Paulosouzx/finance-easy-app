# FinanceApp — Guia de Setup

Aplicação de gestão financeira pessoal. Stack: **React + Vite + TypeScript + Tailwind + Supabase**.

---

## Requisitos

- Node.js ≥ 18
- pnpm ≥ 9
- Conta no [Supabase](https://supabase.com) (gratuita)

---

## 1. Clonar e instalar dependências

```bash
git clone <url-do-repositório>
cd finance-app
pnpm install
```

---

## 2. Criar o projeto Supabase

1. Vai a [app.supabase.com](https://app.supabase.com) → **New project**
2. Escolhe nome, password da base de dados e região
3. Aguarda o provisionamento (~1 min)

---

## 3. Correr o schema SQL

1. No painel Supabase → **SQL Editor** → **New query**
2. Copia o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Clica **Run**

O schema cria todas as tabelas (profiles, accounts, categories, transactions, credit_cards, bills, budgets, goals) e insere as categorias do sistema.

### Ativar Row Level Security (RLS)

No mesmo ficheiro SQL, **descomenta** o bloco `-- ROW LEVEL SECURITY` no final e corre separadamente. Isto garante que cada utilizador só acede aos seus próprios dados.

---

## 4. Configurar variáveis de ambiente

```bash
cp /finance-app/.env.example /finance-app/.env
```

Edita `/finance-app/.env`:

```env
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

Encontras estas chaves no painel Supabase → **Project Settings** → **API**.

> ⚠️ Nunca comites o ficheiro `.env`. Já está no `.gitignore`.

---

## 5. Ativar autenticação

### Email/Password (já funciona por defeito)
No painel Supabase → **Authentication** → **Providers** → **Email** → ativa.

### Google OAuth
1. Cria credenciais OAuth em [console.cloud.google.com](https://console.cloud.google.com)
   - Application type: **Web application**
   - Redirect URI: `https://<projeto>.supabase.co/auth/v1/callback`
2. No Supabase → **Authentication** → **Providers** → **Google** → ativa e cola **Client ID** e **Client Secret**
3. Adiciona o teu domínio em **Redirect URLs**: `http://localhost:5173`, `https://teu-dominio.com`

---

## 6. Ativar Realtime (opcional)

Para transações em tempo real (multi-dispositivo / 2º titular):

1. Supabase → **Database** → **Replication**
2. Ativa as tabelas: `transactions`, `accounts`

O hook `useRealtimeTransactions` em `src/hooks/useRealtimeTransactions.ts` conecta automaticamente quando o Supabase está configurado.

---

## 7. Adicionar ícones PWA

Para a app ser instalável, adiciona ícones PNG em `public/icons/`:
- `public/icons/icon-192.png` (192×192 px)
- `public/icons/icon-512.png` (512×512 px)

Podes gerar a partir do logo em [realfavicongenerator.net](https://realfavicongenerator.net).

---

## 8. Correr em desenvolvimento

```bash
pnpm --filter @workspace/finance-app run dev
# Abre http://localhost:5173
```

---

## 9. Build para produção

```bash
pnpm --filter @workspace/finance-app run build
# Output em /finance-app/dist/public/
```

### Deploy no Vercel
```bash
npx vercel --cwd /finance-app
```
Define as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas settings do projeto Vercel.

### Deploy no Netlify
Configura `/finance-app/dist/public` como pasta de publicação.
Adiciona as variáveis de ambiente na UI do Netlify.

---

## Estrutura relevante

```
/finance-app/
├── src/
│   ├── lib/
│   │   ├── supabase.ts          # Cliente Supabase (lê .env)
│   │   └── supabase.types.ts    # Tipos TypeScript da base de dados
│   ├── contexts/
│   │   ├── auth.tsx             # AuthContext (signUp, signIn, Google, signOut)
│   │   └── user-preferences.tsx # Tema e módulos ativos
│   ├── services/                # Queries Supabase (accounts, transactions, etc.)
│   ├── hooks/
│   │   └── useRealtimeTransactions.ts  # Realtime subscriptions
│   └── components/
│       └── pwa-install-prompt.tsx      # Botão de instalação PWA
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Schema + RLS comentado
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker (cache assets)
└── .env.example                # Template de variáveis de ambiente
```

---

## Checklist de migração para Supabase

- [ ] Projeto Supabase criado
- [ ] `001_initial_schema.sql` corrido
- [ ] RLS ativado e políticas descomentadas
- [ ] `.env` preenchido com URL e Anon Key
- [ ] Autenticação Email/Password ativa
- [ ] Google OAuth configurado (opcional)
- [ ] Realtime ativado nas tabelas (opcional)
- [ ] Ícones PWA adicionados em `public/icons/`
- [ ] Hooks/serviços atualizados para chamar Supabase em vez da API Express
