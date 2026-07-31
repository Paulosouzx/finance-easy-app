# Expense Reminder Push Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status (2026-07-31):** Tasks 1-3 are DONE and merged into `main` (commits `78e6eab`, `6933032`, `71b16d8`, merged via `29c0af3`). Start at **Task 4**. Notes for whoever continues:
> - The migration `finance-app/supabase/migrations/010_add_expense_reminder.sql` exists in the repo but has **not been applied** to the live Supabase project yet (`Finance-App`, ref `kuuwciswftbojaogkgul` — reachable via the Supabase MCP tools if connected). Apply it before Task 4's Settings toggle can be tested end-to-end.
> - A real VAPID keypair was generated for Task 2. The public key is already in `finance-app/.env` (gitignored, local only). The private key was reported to the human partner out-of-band for setting as a Supabase Edge Function secret (`VAPID_PRIVATE_KEY`) — it is NOT in any tracked file. Confirm with the human partner whether that secret was actually set before relying on it in Task 7/8; if unsure, regenerate a fresh pair rather than assume the old one is still what's configured.
> - `finance-app/src/services/reminder.ts` (Task 3) is complete but not yet wired into any UI — Task 4 is the first task that calls it.
> - Unrelated to this plan: a separate Excel-export feature (`finance-app/src/lib/excel-export.ts`, gated behind a "Exportar Transações" module toggle in Settings) was built and merged directly to `main` ahead of this plan, under time pressure. It doesn't touch anything in this plan's scope.

**Goal:** Send a Web Push notification to opted-in users who haven't logged a transaction in the last 5 hours, only between 08:00–23:00 (UTC), and deep-link the click into the "new transaction" flow.

**Architecture:** Web Push (VAPID) end to end — a new `push_subscriptions` table stores browser subscriptions, a Settings toggle drives subscribe/unsubscribe, the existing hand-written service worker (`finance-app/public/sw.js`) gains `push`/`notificationclick` handlers, and a Supabase Edge Function (`send-expense-reminders`) runs hourly via `pg_cron` to find eligible users and send pushes via the `web-push` library.

**Tech Stack:** React 19 + Vite + TypeScript (frontend), Supabase Postgres + Edge Functions (Deno) + pg_cron/pg_net (backend), `web-push` npm package (Deno `npm:` specifier) for the VAPID push protocol.

## Global Constraints

- No test framework exists in this repo (confirmed gap, out of scope to introduce). Every task below is verified manually — steps say exactly what to click/run and what you should observe, instead of `pytest`/`vitest` commands.
- 08:00–23:00 window is evaluated in **UTC** (documented limitation — no per-user timezone field exists yet).
- RLS must stay respected: the frontend only ever reads/writes its own `push_subscriptions` row (`user_id = auth.uid()`); the Edge Function uses the Supabase **service role** key and bypasses RLS by design (it needs to read every opted-in profile).
- Secrets (VAPID private key, Supabase service role key) must never be committed to git. Any SQL that embeds a real secret is run directly in the Supabase SQL Editor, not committed as a tracked migration with the real value inside.
- Follow existing patterns: services in `finance-app/src/services/*.ts` are plain async functions over `supabase`, not classes; migrations are numbered SQL files under `finance-app/supabase/migrations/`, written in Portuguese comments to match `001`–`009`.

---

### Task 1: Database schema — `push_subscriptions` table + profile columns

**Files:**
- Create: `finance-app/supabase/migrations/010_add_expense_reminder.sql`
- Modify: `finance-app/src/lib/supabase.types.ts:1-22` (profiles Row) and add a new `push_subscriptions` table block after the `goals` table entry

**Interfaces:**
- Produces: table `public.push_subscriptions(id, user_id, endpoint, p256dh, auth, created_at)`; new columns `public.profiles.reminder_enabled boolean`, `public.profiles.last_reminder_sent_at timestamptz`. Later tasks (2, 3, 8, 9) read/write these exact names.

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- FinanceApp — Lembrete de registo de gastos (push notifications)
-- ============================================================
-- Corre este ficheiro no SQL Editor do teu projeto Supabase.
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

alter table public.profiles add column if not exists reminder_enabled boolean not null default false;
alter table public.profiles add column if not exists last_reminder_sent_at timestamptz;
```

- [ ] **Step 2: Apply the migration**

Run it against the project's Supabase instance — either paste it into the Supabase Dashboard → SQL Editor and run, or, if the Supabase MCP tool is connected in this session, call `mcp__claude_ai_Supabase__apply_migration` with this SQL and `name: "add_expense_reminder"`.

- [ ] **Step 3: Verify manually**

In the Supabase Dashboard → Table Editor, confirm `push_subscriptions` exists with RLS enabled (shield icon), and that `profiles` now has `reminder_enabled` (default `false`) and `last_reminder_sent_at` (default `null`) columns.

- [ ] **Step 4: Update generated types**

In `finance-app/src/lib/supabase.types.ts`, add `reminder_enabled: boolean;` and `last_reminder_sent_at: string | null;` to the `profiles` `Row` (right after `currency: string;`, before `created_at: string;`).

Then add a new table block right after the `goals` table block (before the closing of `Tables`):

```ts
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["push_subscriptions"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm run typecheck`
Expected: no new errors (the `profiles` Row change is additive; nothing currently destructures `Object.keys` on it in a way that would break).

- [ ] **Step 6: Commit**

```bash
git add finance-app/supabase/migrations/010_add_expense_reminder.sql finance-app/src/lib/supabase.types.ts
git commit -m "feat: add push_subscriptions table and reminder columns on profiles"
```

---

### Task 2: VAPID keys + environment variables

**Files:**
- Modify: `finance-app/.env` (local only, not committed)
- Modify: `finance-app/.env.example`

**Interfaces:**
- Produces: `VITE_VAPID_PUBLIC_KEY` env var, consumed by Task 3's `reminder.ts`. `VAPID_PRIVATE_KEY`/`VAPID_PUBLIC_KEY`/`VAPID_SUBJECT` Edge Function secrets, consumed by Task 8's Edge Function.

- [ ] **Step 1: Generate a VAPID keypair**

Run: `npx web-push generate-vapid-keys`
Expected output: a `Public Key` and `Private Key` pair printed to the terminal.

- [ ] **Step 2: Add the public key to the frontend env**

In `finance-app/.env`, add:
```
VITE_VAPID_PUBLIC_KEY=<the public key from step 1>
```

- [ ] **Step 3: Document the new variable in `.env.example`**

In `finance-app/.env.example`, after the Supabase section, add:
```

# ─── Web Push (lembrete de registo de gastos) ────────────────
# Gera o par de chaves com: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=<public-key>
```

- [ ] **Step 4: Store the private key as an Edge Function secret (not in any tracked file)**

Run (with the Supabase CLI linked to the project, or via the Supabase Dashboard → Edge Functions → Secrets):
```bash
supabase secrets set VAPID_PUBLIC_KEY=<the public key from step 1>
supabase secrets set VAPID_PRIVATE_KEY=<the private key from step 1>
supabase secrets set VAPID_SUBJECT=mailto:paulosouzx14@gmail.com
```

- [ ] **Step 5: Verify manually**

Run: `supabase secrets list` (or check Dashboard → Edge Functions → Secrets) and confirm all three keys are listed (values are masked, that's expected).

- [ ] **Step 6: Commit**

```bash
git add finance-app/.env.example
git commit -m "chore: document VAPID env var for expense reminder push"
```
(`.env` itself is gitignored and must not be committed.)

---

### Task 3: Frontend reminder service (subscribe / unsubscribe)

**Files:**
- Create: `finance-app/src/services/reminder.ts`

**Interfaces:**
- Consumes: `supabase` client from `@/lib/supabase`; `Database["public"]["Tables"]["push_subscriptions"]["Insert"]` type from Task 1.
- Produces: `isReminderSupported(): boolean`, `enableReminder(): Promise<void>`, `disableReminder(): Promise<void>`. Task 4 (Settings UI) calls these three exactly.

- [ ] **Step 1: Write the service**

```ts
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isReminderSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
}

export async function enableReminder(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) throw new Error("VITE_VAPID_PUBLIC_KEY não configurada");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação negada");

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const json = subscription.toJSON();
  const { error: subError } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      },
      { onConflict: "user_id,endpoint" }
    );
  if (subError) throw subError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ reminder_enabled: true })
    .eq("id", user.id);
  if (profileError) throw profileError;
}

export async function disableReminder(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  const { data: { user } } = await supabase.auth.getUser();

  if (subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
  if (user) {
    await supabase.from("profiles").update({ reminder_enabled: false }).eq("id", user.id);
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS, no errors in `reminder.ts`.

- [ ] **Step 3: Commit**

```bash
git add finance-app/src/services/reminder.ts
git commit -m "feat: add reminder service to subscribe/unsubscribe push notifications"
```

---

### Task 4: Settings UI toggle

**Files:**
- Modify: `finance-app/src/pages/settings.tsx`
- Modify: `finance-app/src/lib/i18n.ts` (add new keys to both the `pt` and `en` dictionaries, following the existing `"settings.install.*"` key pattern seen at lines 50-56 and 115-119)

**Interfaces:**
- Consumes: `isReminderSupported`, `enableReminder`, `disableReminder` from `@/services/reminder` (Task 3); `profile.reminder_enabled` from `getProfile()` (already returns full `profiles` row, Task 1 added the column).

- [ ] **Step 1: Add i18n keys**

In `finance-app/src/lib/i18n.ts`, in the `pt` dictionary (near the other `settings.*` keys):
```ts
    "settings.reminder.title": "Lembrete de registo de gastos",
    "settings.reminder.subtitle": "Recebe uma notificação se não registares nenhum gasto nas últimas 5 horas (das 8h às 23h).",
    "settings.reminder.unsupported": "Notificações push não são suportadas neste navegador.",
    "settings.reminder.error": "Não foi possível ativar o lembrete. Verifica as permissões de notificação do navegador.",
```
And in the `en` dictionary:
```ts
    "settings.reminder.title": "Expense reminder",
    "settings.reminder.subtitle": "Get notified if you haven't logged any expense in the last 5 hours (8am to 11pm).",
    "settings.reminder.unsupported": "Push notifications aren't supported in this browser.",
    "settings.reminder.error": "Couldn't enable the reminder. Check your browser's notification permissions.",
```

- [ ] **Step 2: Wire the toggle in `settings.tsx`**

Add imports at the top:
```ts
import { useState } from "react";
import { isReminderSupported, enableReminder, disableReminder } from "@/services/reminder";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
```
(Check `finance-app/src/hooks/use-toast.ts` exists with this export before adding the import — other pages like `transactions.tsx` already import `useToast` from this path.)

Inside the `Settings` component, after the existing hooks:
```ts
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reminderLoading, setReminderLoading] = useState(false);

  async function handleReminderToggle(checked: boolean) {
    setReminderLoading(true);
    try {
      if (checked) {
        await enableReminder();
      } else {
        await disableReminder();
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      toast({ variant: "destructive", description: t("settings.reminder.error") });
    } finally {
      setReminderLoading(false);
    }
  }
```

Add a new Card, right after the "Modules" Card and before the "Preferences" Card:
```tsx
      {/* Expense reminder */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.reminder.title")}</CardTitle>
          <CardDescription>{t("settings.reminder.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isReminderSupported() ? (
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{t("settings.reminder.title")}</Label>
              <Switch
                checked={profile?.reminder_enabled ?? false}
                disabled={reminderLoading}
                onCheckedChange={handleReminderToggle}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("settings.reminder.unsupported")}</p>
          )}
        </CardContent>
      </Card>
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter @workspace/finance-app run dev`, open the app in Chrome, log in, go to Settings. Confirm the new "Lembrete de registo de gastos" card renders with the switch. Turn it on — the browser's native notification-permission prompt should appear. Accept it, then check in Supabase Table Editor that a row appeared in `push_subscriptions` and `profiles.reminder_enabled` is `true` for your user. Turn it off — confirm the row is deleted and `reminder_enabled` goes back to `false`.

- [ ] **Step 5: Commit**

```bash
git add finance-app/src/pages/settings.tsx finance-app/src/lib/i18n.ts
git commit -m "feat: add expense reminder toggle to Settings"
```

---

### Task 5: Service worker push handling

**Files:**
- Modify: `finance-app/public/sw.js`

**Interfaces:**
- Consumes: push payload shape `{ title: string, body: string, url: string }` sent by the Edge Function (Task 8).

- [ ] **Step 1: Bump the cache version**

In `finance-app/public/sw.js:1`, change:
```js
const CACHE_NAME = "financeapp-v5";
```
to:
```js
const CACHE_NAME = "financeapp-v6";
```
(Matches the existing convention of bumping the version whenever `sw.js` itself changes, so all clients pick up the new push handlers on next load.)

- [ ] **Step 2: Add push and notificationclick listeners**

At the end of `finance-app/public/sw.js`, after the existing `fetch` listener:
```js

// Push: show a notification for the expense reminder
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "FinanceApp";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/transactions?new=true" },
    })
  );
});

// Notification click: focus an existing tab or open a new one at the target URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/transactions?new=true";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
```

- [ ] **Step 3: Verify icon path exists**

Run: `ls finance-app/public/icons/icon-192.png`
Expected: file exists (confirmed present from the PWA icon work in recent commits).

- [ ] **Step 4: Manual verification**

With the dev server running, open DevTools → Application → Service Workers, confirm the updated worker activates (may need "skipWaiting"/reload, already handled by `self.skipWaiting()` in `install`). In DevTools → Application → Service Workers, there's a "Push" test button — use it with a JSON payload `{"title":"Test","body":"hello","url":"/transactions?new=true"}` and confirm a system notification appears. Click it and confirm the app tab navigates to `/transactions`.

- [ ] **Step 5: Commit**

```bash
git add finance-app/public/sw.js
git commit -m "feat: handle push and notificationclick in service worker"
```

---

### Task 6: Auto-open "new transaction" dialog on `?new=true`

**Files:**
- Modify: `finance-app/src/pages/transactions.tsx`

**Interfaces:**
- Consumes: existing `openCreate()` function (already defined in this file, `transactions.tsx:71-75`) and the existing `editParamId` `useEffect` pattern (`transactions.tsx:88-96`) as the template to mirror.

- [ ] **Step 1: Add the new-param effect**

In `finance-app/src/pages/transactions.tsx`, right after the existing `editParamId` effect block, add:
```ts
  const newParam = new URLSearchParams(search).get("new");
  useEffect(() => {
    if (!newParam) return;
    openCreate();
    navigate("/transactions", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newParam]);
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual verification**

With the dev server running, navigate the browser directly to `http://localhost:5173/transactions?new=true`. Confirm the "Nova transação" dialog opens automatically and the URL is rewritten to `/transactions` (no `?new=true` left in the address bar).

- [ ] **Step 4: Commit**

```bash
git add finance-app/src/pages/transactions.tsx
git commit -m "feat: auto-open new-transaction dialog via ?new=true query param"
```

---

### Task 7: Edge Function `send-expense-reminders`

**Files:**
- Create: `finance-app/supabase/functions/send-expense-reminders/index.ts`

**Interfaces:**
- Consumes: `profiles(id, reminder_enabled, last_reminder_sent_at)`, `transactions(created_by, created_at)`, `push_subscriptions(id, user_id, endpoint, p256dh, auth)` from Task 1's schema. Env secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (both auto-injected by Supabase into every Edge Function), plus `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` from Task 2.
- Produces: an HTTP endpoint that, when invoked, sends pushes to eligible users and returns `{ sent: number }` or `{ skipped: string }`. Task 8 (cron) invokes this URL hourly.

- [ ] **Step 1: Write the function**

```ts
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:paulosouzx14@gmail.com";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const utcHour = now.getUTCHours();

  if (utcHour < 8 || utcHour > 22) {
    return new Response(JSON.stringify({ skipped: "outside_window", utcHour }), { status: 200 });
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, last_reminder_sent_at")
    .eq("reminder_enabled", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;

  for (const profile of profiles ?? []) {
    const last = profile.last_reminder_sent_at ? new Date(profile.last_reminder_sent_at).getTime() : null;
    if (last !== null && now.getTime() - last < FIVE_HOURS_MS) continue;

    const { data: recentTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("created_by", profile.id)
      .gte("created_at", new Date(now.getTime() - FIVE_HOURS_MS).toISOString())
      .limit(1);
    if (recentTx && recentTx.length > 0) continue;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", profile.id);

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "FinanceApp",
            body: "Não esqueça de registar os seus gastos de hoje.",
            url: "/transactions?new=true",
          })
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    await supabase.from("profiles").update({ last_reminder_sent_at: now.toISOString() }).eq("id", profile.id);
    sent++;
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});
```

- [ ] **Step 2: Deploy the function**

Run: `supabase functions deploy send-expense-reminders --no-verify-jwt`

(`--no-verify-jwt` is required because `pg_cron`/`pg_net` calls it with the service-role key in the `Authorization` header, not an end-user JWT.)

If the Supabase CLI isn't linked to the project in this environment, use the Supabase MCP tool `mcp__claude_ai_Supabase__deploy_edge_function` instead, passing the same file content.

- [ ] **Step 3: Manual verification**

Run:
```bash
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/send-expense-reminders" \
  -H "Authorization: Bearer <service-role-key>"
```
Expected: `200 OK` with a JSON body like `{"sent":0}` or `{"skipped":"outside_window", ...}` depending on the current UTC hour and whether any user has `reminder_enabled = true` yet with no recent transaction. To force a real send during testing, temporarily set your own `profiles.reminder_enabled = true` and ensure you have a `push_subscriptions` row (from Task 4's manual test) and no transaction in the last 5 hours, then re-run the curl command and confirm you receive the OS notification.

- [ ] **Step 4: Commit**

```bash
git add finance-app/supabase/functions/send-expense-reminders/index.ts
git commit -m "feat: add send-expense-reminders edge function"
```

---

### Task 8: Hourly cron schedule

**Files:**
- Create: `finance-app/supabase/migrations/011_schedule_expense_reminders.sql`

**Interfaces:**
- Consumes: the deployed Edge Function URL from Task 7.

- [ ] **Step 1: Write the migration file with a placeholder for the secret**

```sql
-- ============================================================
-- FinanceApp — Agendamento horário do lembrete de gastos
-- ============================================================
-- IMPORTANTE: este ficheiro tem um placeholder <SERVICE_ROLE_KEY>.
-- Substitui pelo valor real APENAS ao correr no SQL Editor do Supabase —
-- nunca faças commit da chave real neste ficheiro.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-expense-reminders-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-expense-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);
```

- [ ] **Step 2: Run it with real values, only in the SQL Editor**

Copy the file's contents into the Supabase Dashboard → SQL Editor, replace `<project-ref>` with the actual project ref and `<SERVICE_ROLE_KEY>` with the actual service role key (Dashboard → Project Settings → API), then run it. Do **not** paste the real key back into the git-tracked file.

- [ ] **Step 3: Verify manually**

Run in the SQL Editor: `select * from cron.job where jobname = 'send-expense-reminders-hourly';`
Expected: one row, `schedule = '0 * * * *'`, `active = true`.

Wait for the top of the next hour (or run `select cron.schedule(...)` again with a `* * * * *` test schedule temporarily to verify faster, then switch back to hourly), then check: `select * from cron.job_run_details order by start_time desc limit 5;` — expect `status = 'succeeded'`.

- [ ] **Step 4: Commit**

```bash
git add finance-app/supabase/migrations/011_schedule_expense_reminders.sql
git commit -m "feat: schedule hourly cron job for expense reminder edge function"
```

---

### Task 9: Documentation

**Files:**
- Modify: `SETUP.md` (checklist section, end of file)
- Modify: `README.md:20` (Product bullet list — add the reminder to the Settings/Definições line, or add its own line)

**Interfaces:**
- None (docs only).

- [ ] **Step 1: Add setup checklist items**

In `SETUP.md`, in the "Checklist de setup" section (end of file), add:
```markdown
- [ ] Par de chaves VAPID gerado (`npx web-push generate-vapid-keys`) e configurado (`VITE_VAPID_PUBLIC_KEY` no `.env`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` como secrets da Edge Function)
- [ ] `010_add_expense_reminder.sql` e `011_schedule_expense_reminders.sql` corridos
- [ ] Edge Function `send-expense-reminders` deployed (`supabase functions deploy send-expense-reminders --no-verify-jwt`)
```

- [ ] **Step 2: Add a product-level mention**

In `README.md`, after the "Definições" bullet in the Product section, add:
```markdown
- Lembrete de gastos: notificação push opcional (a cada 5h, entre 8h-23h) se o utilizador não registar nenhuma transação
```

- [ ] **Step 3: Commit**

```bash
git add SETUP.md README.md
git commit -m "docs: document expense reminder push notification setup"
```
