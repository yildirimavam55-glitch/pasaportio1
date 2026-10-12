# pasaport.io — Full hosting & migration audit (read-only, 12.10.2026)

Verified = observed in code/database on 12.10.2026. Estimate = judgement, not measured.

## Executive summary
- **Can pasaport.io leave Lovable completely?** Yes, technically. No component is impossible to move. Five things must be rebuilt or replaced first: image hosting, Google/Apple sign-in broker, AI translation calls, e-mail sending, scheduled jobs.
- **Ready (verified):** source code (TanStack Start + Vite, standard React), database schema (baseline + 6 ordered migrations, rebuilt from scratch on 12.10 in Phase 1), all business data (73 MB), security rules (112 RLS policies, column grants), 14 languages (static files), mock checkout, Provider Hub, balance monitoring logic, audit log.
- **Not portable yet:** ~225 code/content references to images on Lovable's asset host (`/__l5e/assets-v1/…`, `*.asset.json`); Lovable sign-in broker for Google/Apple (`@lovable.dev/cloud-auth-js`); Lovable AI Gateway (4 admin translation features); Vite config package `@lovable.dev/vite-tanstack-config`; no scheduler; no e-mail provider.
- **Safest architecture:** Option A (managed app hosting + managed Supabase project). Keeps auth, RLS, password hashes and Data API behaviour identical. See `HOSTING_ARCHITECTURE_COMPARISON.md`.
- **Before hiring/handoff:** owner must (1) request a full database + auth export from Lovable support/Cloud (auth schema is not readable from this sandbox), (2) download all images from the asset host, (3) list every secret value privately, (4) decide domain + e-mail provider, (5) resolve eSIM Go 403 with the supplier.
- **Top 5 risks:** 1. Lost images (asset host URLs stop working). 2. Auth export incomplete → customers must reset passwords. 3. eSIM Go key/IP still rejected on new server. 4. Data written during cutover lost (mitigated by freeze, see cutover plan). 5. RLS/grant drift → cost columns or drafts exposed.

## 1. Source code & hosting
| Item | Finding (verified) |
|---|---|
| Framework | TanStack Start 1.168, React 19, Vite 8, Tailwind v4; server functions (245 `createServerFn`) + 2 public API routes (`/api/public/provider-sync`, `/api/public/balance-monitor`), sitemap route |
| Runtime target | Edge worker (Cloudflare Workers style). Also runs on Node with the matching Start adapter (estimate: config change only) |
| Lovable packages | `@lovable.dev/vite-tanstack-config` (build preset — replace with plain `vite.config.ts` + TanStack Start plugin), `@lovable.dev/cloud-auth-js` (OAuth broker in `src/integrations/lovable`, used by `AuthPage.tsx`) |
| Lovable services in code | AI Gateway (`LOVABLE_API_KEY`) in `legal-center`, `promotions`, `trust-translate`, `review-translate` functions — admin-only translation helpers; asset host `/__l5e/` |
| Auto-generated files | `src/integrations/supabase/*` (client, server client, auth middleware) — standard supabase-js, portable |
| Env names | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ESIM_GO_API_KEY`, `ESIM_ACCESS_ACCESS_CODE`, `ESIM_ACCESS_SECRET_KEY`, `VIGNETTE_ID_SANDBOX_API_KEY`, `NEWSLETTER_UNSUBSCRIBE_SECRET`, `LOVABLE_CRON_SECRET`, `LOVABLE_API_KEY`, flags `COMMERCE_LIVE_PROVISIONING`, `PAYMENTS_LIVE`, `SECURITY_LIVE` |
| Tests | 66 files, 1,214 tests (1,208 pass, 6 live-only skipped) — portable, run with `bunx vitest run` |

## 2. Database — see `DATABASE_MIGRATION_PLAN.md`
70 public tables, 143 indexes, 38 triggers, 25 functions, 112 policies, 108 foreign keys; extensions pgcrypto, uuid-ossp, pg_stat_statements, supabase_vault; no pg_cron/pg_net. Size 73 MB.

## 3. Auth — see `AUTH_MIGRATION_PLAN.md`
1 account (owner/admin), 0 customers. `profiles` has 0 rows (signup trigger did not create a row for the restored admin — verify on new server).

## 4. Storage & media (verified)
- Buckets: `media` (private), `database_export_03_10_26`, `database_export_07_10_26` (private) — **all empty (0 objects)**. The two export buckets hold no backup despite their names.
- `media_assets` has 4 rows that point to files that do not exist in storage → broken references.
- Guide hero images (13) and ~225 source files use Lovable's asset host (`/__l5e/assets-v1/…`, `.asset.json` pointers). These URLs are environment-specific and will not resolve outside Lovable. 63 files in `src/assets` are bundled with the code and move automatically.
- No PDFs, no e-mail assets.
- Method: script that lists every `/__l5e/` reference (code + `guides`, `cms_documents`, `theme_settings`, `media_assets`), downloads each file while still on Lovable, uploads to new storage/CDN, rewrites references, then crawls all pages for 404 images.

## 5. Module portability
| Module | Class |
|---|---|
| Homepage & search | Requires code changes (images on asset host) |
| Catalogue & pricing (DB functions `storefront_*`) | Portable with configuration |
| Cart & checkout preparation (mock) | Portable without changes |
| Real payment | Not yet implemented (postponed by decision) |
| Customer dashboard | Portable with configuration; real eSIM data/usage not yet implemented |
| Admin panel (42+ pages) | Portable with configuration; 4 AI translation buttons require replacement |
| Provider Hub | Portable with configuration (secrets) |
| Balance monitoring & notifications | Portable with configuration; scheduler not yet implemented |
| E-mail template management | Partly implemented (tables only); sending not implemented |
| Guides/blog/SEO | Requires code changes (hero images); sitemap needs new domain |
| 14 languages | Portable without changes (static files); DE/EN guides still drafts |
| Security & audit log | Portable with configuration (migrations + grants must be applied exactly) |
| Google/Apple sign-in | Requires replacement (broker) |
| Auth e-mails | Requires configuration (SMTP/provider, templates) |

## 6. External services & jobs (not called)
eSIM Go (active, 403 since copy), eSIM Access (cancelled, credentials still stored), Vignette ID (sandbox key), Lovable Auth broker, Lovable AI Gateway, Lovable default auth mailer, Frankfurter/ECB exchange rates (public). Scheduled jobs: none running — catalogue sync, 15-min balance check and 12h currency refresh must be created (cron hitting the two public routes with a cron secret).

## 7–9
See `HOSTING_ARCHITECTURE_COMPARISON.md`, `CUTOVER_AND_ROLLBACK_PLAN.md`, `MIGRATION_VERIFICATION_CHECKLIST.md`.

## Critical blockers & missing backup coverage
1. No verified backup of `auth` schema (not readable from here) — must come from the platform export.
2. No copy of asset-host images anywhere else.
3. Storage "export" buckets are empty — do not count them as backups.
4. Secret values exist only in the platform secret store — owner must record them privately.
5. Last full data snapshot: `/mnt/documents/.lovable/backups/2026-10-12-before-phase1/` (before Phases 2–5; email tables and balance snapshots added later are not in it).
