# Cutover & rollback plan

1. **Complete backups** — platform DB + auth export, image download from asset host, `pg_dump --schema-only`, code export, private secret list. Verify each file opens.
2. **Provision** — new Supabase project, app hosting, storage bucket/CDN, domain DNS access, e-mail provider (domain DNS SPF/DKIM/DMARC), scheduler.
3. **Database restore** — baseline + migrations, then data (see DB plan), then validation scripts.
4. **Storage** — upload images, rewrite `/__l5e/` references in code and in `guides`/`cms_documents`/`theme_settings`/`media_assets`.
5. **Auth** — restore users, configure Google/Apple/SMTP, redirect URLs.
6. **Secrets** — enter by name (list in FULL audit); new cron secret; keep `PAYMENTS_LIVE`/`COMMERCE_LIVE_PROVISIONING` off.
7. **Deploy** to staging URL.
8. **Background jobs** — create but keep disabled until staging passes; then enable balance check first (read-only), catalogue sync second.
9. **Staging tests** — `MIGRATION_VERIFICATION_CHECKLIST.md` fully, plus E2E mock checkout.
10. **DNS** — lower TTL to 300 s 48 h before; prepare records.
11. **Production cutover**
    - Announce freeze; put admin in read-only (no product/price/content edits); there are no customer orders today.
    - Final delta: re-dump tables changed since step 3 (`admin_audit_log`, `ops_alerts`, `provider_balance_snapshots`, any edited content) — or a full re-dump since the DB is only 73 MB (preferred).
    - Restore, validate counts, switch DNS.
    - **Preventing data loss:** freeze + full re-dump after freeze guarantees nothing written on the old system is missed; old system stays read-only, not deleted.
12. **Rollback** — trigger: sign-in failure, missing data, error rate. Action: point DNS back to Lovable (still intact, frozen data), unfreeze there. Any data created on the new system during the window is exported and replayed manually (expected to be zero while orders are not live).
13. **Post-migration verification** — checklist again on production, monitor 72 h, keep Lovable project untouched ≥ 30 days.
