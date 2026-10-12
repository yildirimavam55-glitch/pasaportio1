# pasaport.io — Hosting migration checklist

Order matters. Tick each box on the new server; never copy secret values into this file or any repo.
Related: `LOVABLE_DEPENDENCIES.md`, `PROVIDERS_AND_SYNC.md`, `BALANCE_MONITORING.md`, `../testing/E2E_TEST_PLAN.md`.

## 1. Code
- [ ] Export repository (GitHub) — exclude `node_modules`, build output, `.env`.
- [ ] Replace each Lovable-specific dependency listed in `LOVABLE_DEPENDENCIES.md` (auth broker, AI gateway, email API, asset storage, dev tagger).
- [ ] Build target: TanStack Start (Vite). Choose runtime (Cloudflare Workers or Node) and set the adapter.
- [ ] Run full test suite (`bunx vitest run`) — must stay green; security baseline tests must never be weakened.

## 2. Database (PostgreSQL)
- [ ] **MANDATORY:** take a NEW full backup (DB dump + schema/RLS + images, with SHA-256 checksums) immediately before cutover. The 2026-10-12 package and its checksum files must be kept, but it is NOT sufficient for cutover.
- [ ] After a dump restore, re-apply the GRANT block of the e-mail template migration (the 2026-10-12 dump did not carry those table grants) and re-run the e-mail RLS test.
- [ ] Create an empty database (PG 15+; tested on 17).
- [ ] Apply `db/baseline/0000_baseline_schema.sql` FIRST (the drizzle `0000` migration cannot run on an empty database).
- [ ] Apply `drizzle/migrations/*` in journal order (0000 → 0001 → 0002 → provider_balance_monitoring → later).
- [ ] Compare schema with the live one (tables, column grants, RLS policies, SECURITY DEFINER functions, triggers).
- [ ] Data dump/restore of `public` (products, prices, translations, guides, CMS, campaigns, theme, settings, audit logs, balance snapshots).
- [ ] Re-check hidden commercial columns (`provider_cost`, `provider_metadata`) are not readable by anon/authenticated.
- [ ] PDF documents: keep `src/assets/fonts/` + OFL licence; see `PDF_DOCUMENTS.md` for pending tables and storage.
- [ ] Export e-mail templates from Admin → E-postalar (JSON) and import them on the new server; the code seed in `src/domain/email/catalog.ts` is the fallback.

## 3. User accounts & authentication
- [ ] Export `auth.users` (including password hashes) and `auth.identities`; import into the new auth system. Users must not need to reset passwords if hashes are compatible (bcrypt).
- [ ] Restore `public.user_roles` (admin role for the owner account) — never derive admin from profile data.
- [ ] Email/password: email verification ON, leaked-password protection ON.
- [ ] Password reset: redirect URL `https://<new-domain>/reset-password` allowed.
- [ ] Google sign-in: create own Google OAuth client; add `https://<new-domain>` and callback URL; replace the Lovable broker call in `AuthPage.tsx`.
- [ ] Apple sign-in: Apple Services ID, key, team ID; callback URL; test before showing to customers.
- [ ] Allowed redirect URLs list contains only the new domain(s).

## 4. Storage
- [ ] Storage currently holds 0 objects; recreate buckets and their policies if any are added later.
- [ ] Product/guide images that are bundled assets move with the code.

## 5. Secrets (names only — values re-entered on the new server)
- [ ] `ESIM_GO_API_KEY` — see task in section 8.
- [ ] `ESIM_ACCESS_ACCESS_CODE`, `ESIM_ACCESS_SECRET_KEY` — supplier cancelled; do not migrate unless re-approved.
- [ ] `VIGNETTE_ID_SANDBOX_API_KEY`
- [ ] `NEWSLETTER_UNSUBSCRIBE_SECRET`
- [ ] `LOVABLE_CRON_SECRET` → rename to own cron secret on the new server.
- [ ] Database URL, service-role key, publishable key of the new backend.
- [ ] Email provider API key (new provider).
- [ ] Payment provider keys — ONLY after migration, separate approval (no Stripe/payments before).

## 6. Scheduled jobs (none active today)
- [ ] Catalogue sync: `POST /api/public/provider-sync` with cron secret header (interval per `PROVIDERS_AND_SYNC.md`).
- [ ] Balance check: `POST /api/public/balance-monitor` every 15 min (per `BALANCE_MONITORING.md`).
- [ ] Exchange rates refresh every 12h (prices hidden when rates are older than 48h).
- [ ] After the first real scheduled call, confirm Admin → Provider Hub shows "automatic monitoring active".

## 7. E-mail
- [ ] Choose sender domain; add SPF, DKIM, DMARC at DNS.
- [ ] Auth e-mails (verification, password reset) branded "pasaport.io", languages TR/DE/EN.
- [ ] App e-mails from the template system (welcome, order confirmation, eSIM delivery notice, payment failed, refund approved, support notice, account deletion). No QR codes or activation secrets inside e-mails — link to the account page.
- [ ] Send test e-mails only to internal addresses.
- [ ] Support address `destek@travely.app` is still the old domain — replace with the new pasaport.io address once the mailbox exists.

## 8. Open technical task — eSIM Go 403 Forbidden (resolve after migration)
- Status: every eSIM Go request (balance + catalogue) returns `403 {"message":"Forbidden"}` since the project copy; code and base URL (`https://api.esim-go.com/v2.4`, header `X-API-Key`) unchanged since the last success on 05.10.2026.
- Likely cause (unconfirmed): stored key not recognised (re-entered value wrong/old) or IP allowlist on the eSIM Go account.
- Steps:
  1. In the eSIM Go portal check key is active, account not suspended, IP restriction setting.
  2. If IP restriction is required, add the new server's fixed outbound IP.
  3. Enter the key on the new server as `ESIM_GO_API_KEY` (never in code/logs).
  4. Press "Check balance" once in Admin → Provider Hub (read-only); the "unavailable" alert should resolve automatically.
  5. Run a MANUAL catalogue sync only after balance read succeeds; new items arrive as DRAFT, prices unchanged.

## 9. Deferred until after migration (not started)
- eSIM Go usage query, real top-up, real eSIM purchase & delivery, Stripe/payments, automatic schedulers.

## 10. Go-live
- [ ] DNS cut-over, HTTPS, redirects from old domain.
- [ ] Full E2E run per `E2E_TEST_PLAN.md` with mock payment; then owner approval before any real payment.
