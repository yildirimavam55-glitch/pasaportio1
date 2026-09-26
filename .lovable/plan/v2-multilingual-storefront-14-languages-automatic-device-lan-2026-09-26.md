# V2 multilingual storefront (14 languages) + automatic device language

Scope: localization only. No redesign, no product/price/cart/checkout/Admin logic changes, no publishing. The existing country picker fixes stay untouched.

## What exists today
- The language list is `tr/de/en`, with TR as the default. It is stored in `localStorage` under `tp.locale`, and it is only applied after the page has hydrated (this is where the wrong-language flash comes from).
- Customer copy lives in separate `Record<Locale, …>` files, about 950 lines across 5 copy files plus `travel-content.ts`. About 38 files contain inline `locale === "tr"` style checks.
- There are locale routes `/tr`, `/de`, `/en` plus guide folders and country pages. Each one sets the language through an effect.

## Phases

**A. Central locale registry.** One `src/i18n/locales.ts` holds the code, native name, `dir`, BCP-47 tag, whether the language is SEO-indexable, and its guide folder. `LOCALES` grows to all 14 codes and the fallback becomes `en`. Copy objects change to `Partial<Record<Locale,T>>` behind one `pick(content, locale)` helper that falls back from the requested language to EN, so a missing key never crashes the page. In development, missing keys are logged once.

**B. Detection and persistence.** A pure `resolveLocale({ urlLocale, stored, navigatorLanguages })` applies the priority: URL, then manual choice, then device languages, then EN. It normalizes variants (`pt-BR` becomes `pt`, `zh-TW` becomes `zh`) and never uses geolocation. A tiny inline head script picks the language before first paint and sets `<html lang dir>`, which prevents the wrong-language flash. The `tp.locale` key is kept, and only a manual switch writes to it (flagged as explicit). To avoid hydration mismatches, the server renders the URL locale. Pages without a locale prefix render after the client resolves the language, using the same approach as the existing theme script.

**C. Translation resources.** Static per-language message files are kept in the repo. The existing TR/DE/EN text is reused. FR/ES/IT/PT/NL/PL/AR/RU/JA/KO/ZH are written once as reviewed commerce copy with no invented claims. Terms like eSIM, GB and Unlimited are kept. Nothing is translated at runtime.

**D. Language switcher.** The existing control opens a compact scrollable list of native language names. Switching keeps the equivalent page (it swaps the locale prefix or maps the guide folder) and leaves the cart untouched.

**E. RTL.** `dir="rtl"` is set for Arabic. Left/right utilities in the storefront are audited and changed to logical ones (`ms/me/ps/pe/start/end`). Directional chevrons are mirrored. Prices, GB amounts and ICCIDs are wrapped in `dir="ltr"`/`<bdi>`. The picker's horizontal geometry is left unchanged.

**F. Routing and SEO.** One dynamic `/$locale` home (plus `/$locale/esim/$slug`), validated against the registry. It replaces the three copied home routes, and the old URLs keep working. New languages are **noindex** and left out of the sitemap and hreflang until someone flips `indexable` after a review. TR/DE/EN SEO stays exactly as it is. Explicit locale URLs are never redirected. Guides and SEO drafts stay TR/DE/EN only.

**G. String audit.** Remaining hardcoded TR/DE/EN strings in the header, bottom nav, homepage, picker, package pages, cart, compatibility checker, install guide, Lounge/Vignette pages, account/auth, support, footer and all states are moved into the resources. Country names come from `Intl.DisplayNames` using the ISO code. The existing search aliases are kept, and the localized name is added as an extra match term, so ranking does not change.

**H. QA.** Unit tests cover all the device-language examples, the priority order and the fallback. Playwright checks every language at 360/390/430/1280/1440: page loads, correct language shown, picker, selection, package page, Standard/Unlimited, cart and no horizontal scroll, with a focus on DE/FR/AR/RU. Then typecheck, tests and build.

## Decisions to confirm
- **Default fallback changes from TR to EN** when nothing matches, as the brief specifies.
- New languages start as **noindex**, and no Wave-1 SEO drafts are translated.
- The bare `/` path shows the auto-detected language with no redirect, and its canonical stays as it is today.

## Delivery
This is large, so it will ship in 2 to 3 passes. Pass 1: A+B+D+E plus the dynamic routes. Pass 2: translation resources and the string audit. Pass 3: SEO wiring and full QA. Nothing is published.
