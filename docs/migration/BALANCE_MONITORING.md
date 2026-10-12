# Provider balance monitoring — migration notes

Status in the current environment: **logic implemented, scheduler NOT configured.**
Balances are only read when an admin presses "Bakiyeyi kontrol et". The Provider Hub
shows "Otomatik izleme aktif değil" until a real scheduled call has arrived
(`last_scheduled_run_at` within 3× the interval).

## Safety
- Read-only: only `adapter.fetchBalance()` is called. No orders, deposits, withdrawals or top-ups.
- Credentials stay server-side (secrets, never in the database or responses).
- Balances and alerts are visible to admins only (RLS `is_admin()`; server functions verify the admin role first).
- Errors are stored as codes (`TIMEOUT`, `READ_FAILED`, `REQUEST_ERROR`); 15 s hard timeout.

## Scheduled job
`POST /api/public/balance-monitor` with header `Authorization: Bearer $CRON_SECRET`.
Call every 5 minutes; each provider is checked only when its own interval (default 15 min) is due.

Example (system cron / any scheduler):
```
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/public/balance-monitor
```
On the new host, replace `src/integrations/supabase/cron-auth.ts` (Lovable-generated) with an equivalent
constant-time bearer check against your own secret.

Only providers with a row in `provider_balance_monitor_settings` and `enabled = true` are checked
(currently eSIM Go on, eSIM Access off).

## Environment variables
- `LOVABLE_CRON_SECRET` (+ optional `_PREVIOUS`) → rename to your scheduler secret.
- eSIM Go API key secret (see PROVIDERS_AND_SYNC.md).
- Database URL + service-role key for the server runner.

## Provider endpoints
- eSIM Go: `GET {base}/organisation` → `organisations[0].balance`, `currency` (read-only).
- New suppliers: implement `fetchBalance()` in their adapter and add the `BALANCE` capability.

## Tables
- `provider_balance_snapshots` — every attempt (ok, amount, currency, error_code, source, checked_at).
- `provider_balance_monitor_settings` — per-provider thresholds in the provider's currency, interval, enabled, last scheduled run.
- `ops_alerts` — new columns `dedupe_key` (unique while not RESOLVED → no duplicates), `acknowledged_at/by`, `updated_at`; new alert types LOW/CRITICAL/EMPTY_PROVIDER_BALANCE, PROVIDER_BALANCE_DROP, PROVIDER_BALANCE_UNAVAILABLE.
- `admin_notification_channels` — EMAIL / TELEGRAM / WHATSAPP, `enabled` pinned to false by a CHECK constraint.

## Alert rules
- Low ≤ 500, critical ≤ 200, empty ≤ 0 (urgent) — in the provider's currency; mismatched currency disables level alerts.
- Sudden drop ≥ 50 % vs highest successful same-currency reading in the last 24 h.
- Unavailable: latest read failed and no success for 120 min.
- One open alert per condition; level escalates in place; top-up / successful read auto-resolves.

## Notification delivery (future, needs approval)
Lift the `enabled = false` CHECK, add a sender in the runner after alert create/escalate, filter by `min_severity`.
- Email: transactional email service + admin recipient list.
- Telegram: bot token secret + chat id.
- WhatsApp: WhatsApp Business API provider credentials + approved template.
