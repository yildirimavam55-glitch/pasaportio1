# Providers, catalogue sync and currency — migration guide

## Providers (table `providers` + `provider_connections`)
| Code | Adapter | State (2026-10-12) | Secret names (values never in repo) |
|---|---|---|---|
| ESIM_GO | NATIVE_ESIM_GO | active, auto_sync on (24h), priority 1 | `ESIM_GO_API_KEY` |
| ESIM_ACCESS | NATIVE_ESIM_ACCESS | active, auto_sync off, cancelled project; 1,728 unpublished drafts | `ESIM_ACCESS_ACCESS_CODE`, `ESIM_ACCESS_SECRET_KEY` |

Other secrets: `VIGNETTE_ID_SANDBOX_API_KEY`, `NEWSLETTER_UNSUBSCRIBE_SECRET`, cron secret used by `src/integrations/supabase/cron-auth.ts`.

Adapters live in `src/providers/adapters/*.server.ts`, resolved only through `factory.server.ts`. Adapters expose catalogue/balance only; no paid order endpoint is reachable (live supplier ordering is disabled in `src/domain/commerce/engine.ts`).

## Catalogue sync
- Engine: `src/lib/provider-sync.server.ts` (`src/providers/sync.ts` for diffing).
- Triggers: Admin "Sync" button (MANUAL) and `POST /api/public/provider-sync` (verifies the cron secret).
- **No scheduler is installed today** — `auto_sync` is a flag only. On the new server add a scheduler (cron) calling the endpoint every `sync_interval_hours` with the secret header.
- Safety: sync never overwrites price, flags or publication of existing products; new items arrive DRAFT with a suggested price. Catalogue drops above `max_catalogue_drop_percent` are blocked.
- Publication: `feature_flags.esim_auto_publish` is **OFF** (since 2026-10-12). Publishing happens only via Admin → Products (bulk/single), which requires sale price > 0, completed price review and supplier availability (`src/domain/catalogue/publish-gate.ts`).
- Data: `provider_raw_items`, `provider_product_mappings`, `provider_price_history`, `provider_catalogue_changes`, `provider_sync_runs`, `provider_sync_errors`.

## Currency
- Source: ECB via `https://api.frankfurter.dev` (keyless), AED/SAR/QAR via USD pegs. Code: `src/lib/currency.server.ts`.
- Refresh: lazily on storefront config read when `nextUpdateAt` passed (every 12h); failures keep the last rates.
- Storefront hides any automatic rate older than 48h (`MAX_RATE_AGE_MS`); EUR stays canonical; Admin overrides still apply.
- History: `exchange_rates`; settings in `platform_settings` id `currency_settings` (Admin-only).

## Checklist on the new server
1. Restore DB (baseline + migrations) and data; verify column grants hide `provider_cost`.
2. Set secrets by name above.
3. Install the sync scheduler; run one MANUAL sync first and review the change report.
4. Confirm `esim_auto_publish` is still off.
5. Check balance (read-only) for each provider.
