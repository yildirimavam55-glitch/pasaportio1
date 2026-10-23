# Turkish-source builder — Issue #6

Stacked on PR #5 (`3e4ac95114f760d4076d76781ad8fadb89bad73b`), target `feat/v2-builder-mvp`. No merge or change to PR #3/#5.

## Visible acceptance

Open the branch preview at `/builder-preview/`.

1. Hero and NOTICE show fixed **TR – Hauptsprache / Ana dil** fields. Select Español under **Vorschau in**: the Turkish source remains populated and unchanged.
2. Initial missing translations are marked missing. Click **Alle 13 Sprachen übersetzen (Demo)**: only known, curated exact-source fixtures are applied. Every machine-style status is explicitly marked DEMO; no network or AI is used.
3. Preview DE/EN/ES/AR and the other registry languages, including RTL. The source field remains Turkish.
4. Click **Übersetzung bearbeiten** to explicitly correct one target. No automatic translation overwrites it, even when its value equals a previous machine value.
5. Change Turkish source. Existing manual and automatic translations become stale through their `_src` fingerprint. Missing/stale machine-owned values are eligible for regeneration; stale manual values require human correction.
6. Type any unknown Turkish text and click the demo button: the demo says there is no example translation. It never fabricates a result. Reload/reset discards all changes.

Existing V2 Admin uses the same fixed-source component for Hero/NOTICE and the independent 14-locale preview selector. Other LT controls use the same source/manual editing helpers. Visitor locale registry, URL/storage/device preferences and storefront fallback behavior are unchanged. Item CTA, labels, alt text and section text remain part of the existing translation field collector; numeric commerce values are excluded.

## Independent server adapter (NOT activated or live-validated)

`trust-translate.functions.ts` keeps the existing authenticated server entry point and authoritative Admin role check; the Lovable gateway/key is removed from this CMS path. It calls `cms-translation.server.ts` via a fixed OpenAI endpoint, strict JSON Schema, bounded batches and response validation. Other pre-existing Lovable consumers, e.g. review translation/trip planning, are outside this task and remain unchanged.

The new endpoint is **fail closed by default**. Server-only configuration would require all of the following, installed by the owner through an approved secret workflow, never in chat or Git:

- `CMS_TRANSLATION_PROVIDER=openai`
- `CMS_TRANSLATION_MODEL=gpt-4.1-mini` or `gpt-4.1-nano`
- `CMS_TRANSLATION_API_KEY` (secret, never requested/read/configured in this work)
- `CMS_TRANSLATION_ENABLED=true`
- `CMS_TRANSLATION_APPROVED=true` (separate owner authorization for paid calls)

Absent/unapproved configuration returns **Übersetzungsdienst nicht konfiguriert / Çeviri servisi yapılandırılmadı oder onaylanmadı**. No upstream call or budget RPC occurs. Admin authentication/role verification still precedes this check.

### Rate and cost boundaries

Only after authentication and approved configuration, the existing atomic `consume_rate_limit` mechanism reserves global capacity (10 requests/day) and per-admin capacity (2 requests/minute). Missing RPC/permissions/database availability fail closed. No schema/grants/RLS changes. Limits of existing services are unchanged. At most 6 fields / 3600 Turkish source characters per request, in batches of 3; at most 2 upstream calls, each capped at 8192 output tokens, 30-second timeout and 160000 response bytes. No automatic retries. This is a token/request cap, not a guaranteed monetary ceiling across future provider price changes. Global cap conservatively covers failed and concurrent requests; unused reservations are not refunded.

Placeholders, brands, numbers, currencies and units are checked as exact multisets; unexpected HTML, schema keys, partial locales, truncated or oversized responses fail validation. Successful fields can survive a different field/batch failure and remain retryable. Semantic accuracy/commercial meaning still requires human review: lexical checks are not a proof of translation quality.

No per-keystroke or blur translation. Explicit translation works in editor memory; **Entwurf speichern & übersetzen** refuses persistence on translation failure. Delayed results are merged only into the matching Turkish source fingerprint and never over current manual corrections. In-memory concurrent changes refuse the save; authoritative database revisions remain PR #3's separate concern.

## Safety and verification boundaries

No provider connection, paid request, API key setup, database access/mutation, login/account creation, Storage upload, product change, publication or production deployment was performed. No real Admin save/publish was tested. The endpoint/validation/provenance paths use synthetic injected Admin, budget and provider dependencies in tests. These prove orchestration, not a live OpenAI/Supabase integration.

PR #3 draft confidentiality and atomic persistence proposals remain unmerged and unexecuted. Therefore no existing database should be connected for save/publish acceptance. A genuinely functioning independent provider needs separate owner configuration/paid-call approval and isolated integration validation before being called production-ready.

CI runs frozen installation, TypeScript, production/Nitro build, existing MVP regressions, new provenance/provider security tests, browser tests (TR→DE/EN/ES/AR plus all 14 locales) and the full Vitest suite. The nine known SQL failures stay visible, unchanged and unmasked. Browser screenshots are acceptance fixtures with system-font fallback. A pinned, Git-blob-hash-verified Noto CJK font is installed only in the disposable runner; CDP checks actual glyph use for Japanese, Korean and Chinese. No font is uploaded to the app or loaded over the network by the demo. This is not a claim about every customer's font environment.

Stop for owner visual acceptance. No merge or publication.
