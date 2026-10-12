# Database migration plan

## Inventory (verified 12.10.2026, row counts)
Catalogue & suppliers: service_products 7,162 · esim_product_details 7,162 · provider_product_mappings 7,174 · provider_raw_items 7,161 · provider_catalogue_changes 7,162 · provider_price_history 11,611 · providers 2 · provider_connections 2 · provider_sync_runs 3 · provider_sync_errors 3 · pricing_rules 1 · services 5 · route_presets 1 · esim_device_compatibility 53 · esim_usage_settings 1.
Currency: exchange_rates 120.
Content: guides 14 · guide_translations 34 · guide_categories 6 · cms_documents 1 · cms_versions 7 · theme_settings 1 · media_assets 4 (files missing) · promotions 2.
Settings & security: platform_settings 6 · feature_flags 11 · user_roles 1 · security_rate_limits 6 · admin_audit_log 38.
Monitoring: ops_alerts 4 · provider_balance_snapshots 1 · provider_balance_monitor_settings 2 · admin_notification_channels 3.
E-mail: email_templates / _translations / _versions 0 (tables created 12.10).
Orders & eSIM: orders 0 · order_items 0 · payment_transactions 0 · provisioning_units 0 · customer_esims 3 (not linked to orders) · refund_requests 1 · refund_request_events 1.
All other tables: 0 rows. Total 70 tables, 73 MB.

Schema objects: 143 indexes (incl. GIN on eSIM coverage — required), 38 triggers, 25 functions (several SECURITY DEFINER), 112 RLS policies, 108 FKs, column-level grants hiding `provider_cost`/`provider_metadata`. Extensions: pgcrypto, uuid-ossp, pg_stat_statements, supabase_vault.

## Procedure
1. **Freeze** admin edits (see cutover plan).
2. **Schema:** on the new database apply `db/baseline/0000_baseline_schema.sql`, then `drizzle/migrations/0000…0005` in journal order. (0000 fails on an empty DB without the baseline.)
3. **Data:** `pg_dump --data-only --schema=public --disable-triggers` from the source (via platform-provided connection or export); restore with `psql` in one transaction. Triggers disabled during restore so append-only/guard triggers do not reject historical rows.
4. **Sequences/defaults:** none rely on serial counters except internal; verify with `SELECT setval` check if any appear.
5. **Auth:** see `AUTH_MIGRATION_PLAN.md` (must be restored before `user_roles` FK validation).
6. **Validate:**
   - Row counts per table equal source (script comparing `count(*)` of all 70 tables).
   - Checksums: `md5(string_agg(t::text, '' ORDER BY id))` for products, prices, translations.
   - Schema diff: `pg_dump --schema-only` of both sides, diff must be empty.
   - Security: run `security_baseline_status()` and the vitest security suite against the new DB; anon must not read `provider_cost`.
   - Functions `storefront_country_starting_prices` / `storefront_regional_package_rows` return same results as source.
7. **Backups on new host:** daily automated + point-in-time recovery; test one restore before go-live.

## Not to migrate
`security_rate_limits`, `idempotency_keys` (transient). eSIM Access drafts (1,728) only if owner wants them kept.
