# Expense Reminder Push Notification — Design

## Problem

Users forget to log expenses throughout the day. There's no proactive nudge; the app only shows data when opened. We want a recurring reminder, delivered even when the app is closed, prompting the user to log today's spending if they haven't logged anything recently.

## Requirements (from stakeholder Q&A)

- Delivery must work with the app closed (real push notification, not just an in-app banner).
- Reminder fires on a rolling 5-hour window per user, not a blind fixed-clock schedule: only send if the user hasn't created a transaction in the last 5 hours.
- Only send during waking hours: 08:00–23:00. No notifications outside that window.
- Opt-in: off by default, user enables via a Settings toggle (which also triggers the browser's notification-permission prompt).
- Clicking the notification opens the app directly on the "new transaction" flow, not the dashboard.

## Architecture

Web Push (VAPID) — native browser standard, works with the app closed, no third-party service (Firebase/OneSignal) needed, and the app already ships a hand-written service worker (`finance-app/public/sw.js`) that resulting push handlers can hook into.

### Data model changes

New table `push_subscriptions`:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid references auth.users not null`
- `endpoint text not null`
- `p256dh text not null`
- `auth text not null`
- `created_at timestamptz default now()`
- RLS: user can select/insert/delete only their own rows (`user_id = auth.uid()`).
- Unique constraint on `(user_id, endpoint)` — a user may have multiple devices/browsers subscribed.

`profiles` table gains two columns:
- `reminder_enabled boolean not null default false`
- `last_reminder_sent_at timestamptz` (nullable)

Migration file: `finance-app/supabase/migrations/010_add_expense_reminder.sql`.

### Scheduling

A Supabase Edge Function `send-expense-reminders` is invoked **hourly** by `pg_cron` (via `pg_net.http_post` calling the function URL with the service-role key, the standard Supabase cron-to-edge-function pattern).

Running hourly (not "every 5h fixed") lets the 5-hour window roll from each user's own `last_reminder_sent_at` instead of a single clock-aligned schedule shared by everyone — this is more resilient to cron delays and doesn't clump all users into 4 fixed daily slots.

Per invocation, the function selects eligible users:
```sql
select p.id, p.reminder_enabled
from profiles p
where p.reminder_enabled = true
  and extract(hour from now() at time zone 'utc') between 8 and 22 -- inclusive window, last send still allowed at 23:xx
  and (p.last_reminder_sent_at is null or now() - p.last_reminder_sent_at >= interval '5 hours')
  and not exists (
    select 1 from transactions t
    where t.created_by = p.id
      and t.created_at >= now() - interval '5 hours'
  )
```
For each eligible user, fetch their `push_subscriptions`, send a Web Push payload (title: app name, body: "Não esqueça de registrar seus gastos de hoje"), and update `last_reminder_sent_at = now()`.

**Known limitation:** no per-user timezone field exists in the schema today, so the 08:00–23:00 window is evaluated in UTC. This is accepted as good-enough for the current single-timezone (Portugal) user base. If reminders land at the wrong local hour during testing, a follow-up would add a `profiles.timezone` column and adjust the query — out of scope for this spec.

### VAPID keys

A VAPID keypair is generated once (e.g. via `web-push generate-vapid-keys`). The public key is exposed to the frontend via a Vite env var (`VITE_VAPID_PUBLIC_KEY`); the private key is stored as a Supabase Edge Function secret (`VAPID_PRIVATE_KEY`), never shipped to the client.

### Frontend changes

**Settings page** (`finance-app/src/pages/settings.tsx`): new toggle "Lembrete de registro de gastos".
- Turning on: requests `Notification.requestPermission()` → on grant, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VITE_VAPID_PUBLIC_KEY })` → saves the resulting subscription (endpoint/p256dh/auth) to `push_subscriptions` → sets `profiles.reminder_enabled = true`.
- Turning off: unsubscribes the browser's `PushSubscription`, deletes the matching row from `push_subscriptions`, sets `reminder_enabled = false`.
- If permission is denied by the browser, the toggle reverts to off and shows an explanatory message (permission must be changed in browser site settings to retry).

**Service worker** (`finance-app/public/sw.js`): add two listeners.
- `push` event: parses the payload, shows a notification (title/body from payload, using existing app icon).
- `notificationclick` event: closes the notification, and focuses an existing client or opens a new one at `/transactions?new=true`.

**Transactions page** (`finance-app/src/pages/transactions.tsx`): recognize a `?new=true` query param on mount and auto-open the existing add-transaction dialog (the page already has CRUD with a dialog; this just triggers it programmatically instead of requiring a click).

### Error handling

- If a push send returns HTTP 410 (Gone) or 404 from the push service, the corresponding `push_subscriptions` row is deleted (subscription is dead — nothing to retry). The user only gets reminders again if they re-enable the toggle (which re-subscribes).
- Edge Function failures for one user (e.g. malformed subscription) are caught per-user so one bad row doesn't abort the whole batch.

## Testing

No test framework exists in the repo yet (confirmed gap, out of scope to introduce here). Verification will be manual:
- Toggle on in Settings on a real device/browser, confirm OS-level permission prompt appears and subscription row is created.
- Manually invoke the Edge Function (via Supabase dashboard or `supabase functions invoke`) with a test user that has no recent transactions inside the 8–23 window, confirm a push arrives and `last_reminder_sent_at` updates.
- Log a transaction, re-invoke the function within 5h, confirm no push is sent (transaction-exists check).
- Toggle off, confirm subscription row is removed and a subsequent invocation does not notify that user.
- Click a delivered notification, confirm the app opens on `/transactions` with the add-transaction dialog already open.

## Out of scope

- Per-user timezone support (noted limitation above).
- Notification content customization by the user.
- Any bill/budget-alert notifications (separate feature, not part of this spec).
- Automated recurring-transaction generation (separate feature, not part of this spec).
