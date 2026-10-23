# Whole-page translation — Issue 8

## Owner acceptance (offline only)
Open the Draft PR preview at `/builder-preview/` (exact URL in PR).
1. Turkish is fixed. Choose any of 14 preview languages; TR input stays unchanged.
2. Press **Tüm sayfayı 13 dile çevir (DEMO)** once: Hero AND NOTICE translate together. DEMO means curated exact-match fixtures, no AI.
3. Open **13 dil · Durum / Restliste** for counts and exact field/locale remainder. Repeat: fresh fields generate zero requests.
4. Choose Spanish, open manual editing, change title. Change Turkish source: manual Spanish remains, marked stale. Unknown Turkish yields **Keine Beispielübersetzung**, not fabricated output.
5. Reset/reload discards session changes. No database, storage, upload, publish or shop-search requests.

## Contract and limits
Single whitelist-based collector covers registered editorial fields, item title/body/CTA/alt/labels, caption/alt. Review bodies, destination/product item labels, commercial comparison facts/numerics, arbitrary unregistered fields and customer/provider records are excluded. Section/item IDs form unambiguous JSON identity; duplicate IDs fail closed. Label index is scoped to its item. Exact-source dedup only; each field's independent provenance is checked again when merging.

Plans stay <=6 sources and <=3600 chars per request, <=900 per source; no truncation. Existing server subbatches of3, global10/day, Admin2/min remain. Each explicit real action permits max2 requests, then pauses honestly with a remainder. No sleeps/background loops/automatic retries. Repeated immediate manual actions still encounter the atomic server limiter. Global reservations can be consumed by denied user reservations or failed provider calls; counts are request reservations, not tokens/money. Retry replans only missing/stale machine-owned fields; known successes and manual values remain. Source changes during flight are rejected, not applied to another section. Partial results remain in editor memory.

Plain draft save no longer invokes translation. Optional combined action omitted intentionally; translation and persistence are visibly independent. Existing DB-write safety gaps from PR3 remain: no real save/publish acceptance executed and no SQL applied. Neither translation action publishes. No production configuration changed.

## Later controlled provider integration — separate owner approval required
- Resolve PR3 draft isolation/atomic persistence separately with isolated SQL tests and upgrade approval.
- Owner supplies backend-only CMS_TRANSLATION_API_KEY plus approved provider/model configuration; never VITE/browser variables. Keep ENABLED and APPROVED off until explicit cost approval.
- Approve exactly one tiny Turkish text in an isolated admin test, no commercial claims/customer data. Reserve budget via existing RPC; record request/locale counts without secret/content logging.
- Verify actual locale validation, protected tokens, partial failure, Admin denial, budget denial and manual preservation. Disable gate after test.
- A further explicit approval is required before production translation. Fourteen locales today; forty is future scope.

## Validation
CI runs frozen install, TypeScript, production/Vercel SSR build, inherited+new focused tests, actual Chrome3-width14-locale checks and screenshots, then full unmasked Vitest. No paid provider, live DB/auth or Docker tests. Exact results and preview are reported in PR after execution. Nine pre-existing SQL failures remain separate; no tests weakened or skipped.
