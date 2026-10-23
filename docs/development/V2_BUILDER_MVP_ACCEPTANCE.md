# V2 builder MVP — Issue #4

## Scope

Branch `feat/v2-builder-mvp`, based on `chore/launch-readiness-2026-10-22` at `a0a6cd47eea22f741c17c4926c9cc245aaceeb1e`.
Only SEARCH_HERO and NOTICE presentation. No PR #3 code copied, database/Storage changes, publication, product, pricing, account, checkout or provider changes.

- Existing V2 Admin keeps draft/history/postMessage/save/publish flow and MediaPicker. New color controls and optional tablet media/crop are JSON-only, sanitized and collected by the existing media resolver.
- Hero data-connected wrapper retains the original search child, promotion and trust integrations. Hook-free `V2HeroView` is shared with the disconnected acceptance preview.
- Field-specific copy fallback fixes overwritten subtitles; explicit title edits bypass legacy title substitution only for the edited locale. Manual LT values and `_auto`/`_src` rules are unchanged.
- Built-in imagery keeps the untouched legacy crop. Explicit desktop crop edits are recorded so even the same numeric crop can intentionally replace it. Mobile/tablet crops are independent.
- NOTICE keeps its previous default card markup and now consumes the same optional design frame. Other sections are unchanged.
- Fonts select existing theme heading/body families, not arbitrary CSS or third-party font URLs. Colors accept only six-digit hexadecimal values. No new Lovable integration.

## Try it without a database

After build: `/builder-preview/` on the preview host. It is a separate static bundle (no TanStack root loader, Supabase SDK, authentication, upload, save or publish APIs).

1. Select SEARCH_HERO, German. Edit only the subtitle. The visible subtitle changes while the default title remains unchanged.
2. Edit the title, choose `Başlık yazı tipi`, a heading color, and mobile/tablet/desktop sizes, e.g. 28/36/50.
3. Switch 390/768/1440. Each viewport is a real iframe viewport, not a CSS-scaled approximation.
4. Select an existing terrace photo for tablet, move its crop. Desktop/mobile images remain independent.
5. Select NOTICE; edit title/text, heading/body colors, sizes, background and spacing.
6. Switch languages, especially DE/TR/EN/FR/AR/JA/ZH. Arabic canvas uses RTL.
7. Reset with “Vorher / vollständig zurücksetzen”. Reload discards all demo changes.

Demo input labels are administrative acceptance instructions, not new storefront translations. NOTICE sample text is synthetic demo content, never saved to the homepage. The search button in this disconnected demo is intentionally disabled: it does not substitute or claim to test commerce.

## Try the existing authenticated Admin (separate authorized preview only)

`/admin/storefront/v2/esim` → SEARCH_HERO → text/image/crop and “Tasarım ayarları”. Tablet appears beside desktop/mobile; the existing MediaPicker is retained. Add/select NOTICE and change its design. Use the existing 390/768/1440 Draft preview; do not publish during this acceptance.

The MVP does **not** resolve PR #3's confirmed database draft exposure or concurrent-save issues. Do not connect this branch to a live database or treat an authenticated save/publish as security-approved. The static demo lets the owner evaluate the actual renderer/control connection independently of these blockers.

## Verification

CI `.github/workflows/builder-mvp.yml` executes frozen Bun installation, TypeScript, production/Vercel build, targeted regressions, actual Chromium control/iframe/media/NOTICE/locale tests and the full Vitest suite. Screenshot/preview artifacts are uploaded even if the known full-suite SQL failures remain. No `continue-on-error`, test exclusions or pipelines masking failures.

The browser test blocks all non-loopback requests and fails if any are attempted. Screenshots: before/after at 390/768/1440, NOTICE and representative locales. The static demo deliberately omits the data-connected promotion/trust modules and external Google webfonts; system font fallback can therefore differ from the authenticated app, while the same theme-family tokens are exercised. These are isolated component/draft-preview screenshots, not claims of a live Admin save, live search/catalogue or whole-homepage E2E pass. CI results must be reported from the actual run, not inferred from this document.

Known nine SQL failures remain separately visible: product cost grants, refund confirmation, has_role self-scope/anonymous execution, platform_settings table/projection, anonymous Admin RPC, and missing historical 0006 email / 0007 PDF migration tests. No assertions are changed.

## SQL proposals from PR #3

Local runtime has no `psql` or `postgres` executable; local Docker use is restricted and no container workaround is attempted. Isolated SQL execution therefore remains **NOT TESTED**. No existing database was accessed. PR #3 remains separate and requires isolated synthetic PostgreSQL testing and explicit database approval; it does not block the disconnected UI acceptance.

## Before any merge or publication

- Owner's visual approval of default and edited states.
- Review CI screenshots versus supplied references; this is a wiring fix, not a redesign.
- Resolve PR #3's draft confidentiality and atomic save/revision proposals through their separate approval path.
- Real authenticated Admin save/reload and shop-search E2E in a separately approved safe test backend.
- Existing translation-resource gaps, if any, need language review; 14-locale execution is not a claim of 40 languages or a new automatic translator.
