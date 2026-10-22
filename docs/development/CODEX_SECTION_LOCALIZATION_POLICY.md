# Pasaport.io — Codex: one section at a time + multilingual parity

**Status:** Mandatory implementation/QA policy for future Codex tasks. **This document is NOT evidence that automatic translation is already implemented.** Work only on `chore/launch-readiness-2026-10-22` or a separate PR branch. Never deploy to production, approve DB changes, enable payments, or run paid supplier orders automatically.

## Current code, verified 2026-10-22

- Current registered UI languages: `tr en de fr es it pt nl pl ar ru ja ko zh` = **14**, see `src/i18n/locales.ts`.
- TR/DE/EN have separately maintained main copy. Other languages use English source strings + static files `src/i18n/resources/*.json`. A missing key falls back to English, not live machine translation; see `src/i18n/overlay.ts`.
- CMS store `src/domain/storefront/v2.ts` has `LT` values with provenance metadata `_auto` / `_src`, statuses `MISSING / AUTO_TRANSLATED / MANUALLY_EDITED / OUTDATED`. Do not overwrite manual translations.
- `src/lib/trust-translate.functions.ts` still calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY` for admin-only translation drafts. That legacy provider must be replaced with a separately authorized, Lovable-independent translation backend; do not call it, hardcode credentials or claim it works.
- The Hero uses CMS `mediaId`, `mobileMediaId` plus desktop/mobile fallbacks, not one image per UI language. A locale-specific image/video/alt text management system is not implemented yet.
- Desired future target: **up to 40 languages**, but extending UI_LOCALES requires registry, resource, routes, RTL, SEO, fonts and QA support; do NOT pretend 40 are already configured or publish untranslated pages.

## Codex work boundaries — REQUIRED

1. **One visible section per task**: Hero, Search, Trust strip, Popular Countries, Regions, Country/Plan Picker, Menu, FAQ or Footer. Do not rework the rest as part of the same PR unless strictly necessary for a shared dependency.
2. Follow the owner's supplied design screenshots and `docs/design/PASAPORT_VISUAL_TARGET_2026-10-22.md`. Preserve CMS configuration, 14-language setup, all previously working business logic, price integrity and accessibility. Fix defects rather than implementing a parallel homepage.
3. All newly added/changed user-facing strings (headings, buttons, placeholders, alt, aria labels, error/empty/loading copy, FAQ, SEO snippets where relevant) must use the shared locale registry and be translated to **all 14 currently registered UI languages**. No hard-coded TR/DE/EN ternaries for content introduced by the PR and no unreviewed English fallback accepted as "translation completed".
4. German brand copy must use informal `du`; preserve brand names, numbers and units, provider and refund claims exactly. No invented pricing, ratings, carrier capabilities, delivery/refund guarantees.
5. Preserve `MANUALLY_EDITED` CMS values; mark outdated translations for review, never silently overwrite. Track provenance and translation status by (section, field, locale) to make partial failures retryable.
6. Hero/visual changes: image **without embedded text** can normally be shared across all languages (still provide localized alt and appropriate desktop/mobile crop). Images **with text embedded in the raster**, captions, badges, region/country overlays or locale-specific art direction need translated text **outside the raster** wherever possible, or explicit locale-specific media and verified font/layout. Don't claim an image has been "translated" when only its alt text changed.
7. Currency is independent of language and sourced from the existing CurrencyProvider. Only display published, verified product prices from Supabase; empty staging should not produce fake `ab/from` offers.
8. Test 390px mobile and 1440px desktop minimum for TR/DE/EN plus representative long text (DE), FR, Arabic RTL, and Asian text (JA/ZH); verify all 14 resource keys, horizontal overflow, wrapping, locale selection, menu, hero image crops and route linking. Include links/screenshots in PR; if a locale/image is missing, report it and do not mark the section complete.
9. TypeScript, build, Vitest/CI. The pre-existing 9 SQL-security-test failures remain blockers and must not be hidden or weakened.

## Separate implementation task: Lovable-independent automatic translation

This is a **future build task**, not the current state:
- A server-side, authenticated translation service (provider and credentials supplied explicitly by owner) accepts a changed CMS section/field **draft**, generates translations only for missing/outdated machine-owned values, validates complete locale responses, preserves placeholders/units/claims and produces reviewable drafts.
- A server-side media catalogue with locale-aware alt/title/captions and optional locale-specific desktop/mobile assets. Keep base image shared where appropriate.
- Admin preview shows statuses for each of the 14 configured locales; preserve manual edits. Publishing is a separate owner-approved action after validation, not an automatic side-effect of any Codex commit.
- Only after 14-language parity works and is measured, build a separately reviewed 40-language expansion using one registry and tested routing/SEO/RTL. Never expand the public language switcher without actual translated resources and tests.

## Required report from every Codex section PR

- **Changed section only:** ...
- **Visual comparison:** screenshots 390px / 1440px vs owner's reference
- **Translation coverage:** 14/14 + missing/outdated counts; note language-specific media
- **Tests:** TypeScript, build, targeted, E2E and known unrelated failures
- **Risk review:** production/db/payment/supplier untouched
- **Preview link:** ...
