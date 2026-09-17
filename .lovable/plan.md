# Travel Platform V2 — Phase 1 Plan

## Goal
Build the approved, mobile-first customer presentation layer for eSIM and Lounge while preserving the complete Phase 0 architecture. Phase 1 remains presentation, configuration, and interaction scaffolding only: no provider connection, payment, provisioning, booking, or Phase 2 recommendation logic.

## Visual direction
- Translate the approved references into a warm cream/off-white travel experience with deep petrol branding, restrained orange actions, compact rounded surfaces, subtle shadows, and strong modern typography.
- Keep the hero visually rich but compact enough that the service selector and finder appear quickly.
- Use distinct, optimized desktop/mobile photography for eSIM and Lounge, with service-specific and neutral fallbacks, alt text, and focal-position metadata.
- Centralize semantic colors, typography, radii, shadows, spacing, widths, safe areas, and button variants in the design system. Keep the temporary brand in one typed brand configuration.

## Customer experience
- Replace the Phase 0 placeholder shell with a responsive public shell:
  - Desktop: brand, eSIM, Lounge, Destinasyonlar, Nasıl Çalışır, Destek, language, account, and “Seyahatini planla”.
  - Mobile: compact brand/language/account/menu header and fixed safe-area bottom navigation with exactly Ana Sayfa, eSIM’imi Bul, Lounge Bul, Hesabım.
  - Never expose Admin, Car Rental, Transfer, or “coming soon” entries publicly.
- Make the homepage service-driven through validated `?service=esim|lounge`; missing or invalid values safely resolve to eSIM.
- Service changes replace the hero, finder, recommendation shell, pricing, popular content, campaign, education, cross-sell, and final action. Incompatible finder state is reset deterministically.
- Keep `/esim` and `/lounge` as shareable service entry routes, using the same safe experience with their service selected.

## Typed configuration and content
- Add a typed service registry with independent `EsimServiceConfig` and `LoungeServiceConfig`; shared visual contracts contain no mutable service state.
- Add distinct `GLOBAL_CONTENT`, `ESIM_CONTENT`, and `LOUNGE_CONTENT` namespaces for TR/DE/EN.
- Extend translation lookup to fall back per field to Turkish and always return display-safe text.
- Add controlled section configuration: kind, visibility, order, variant, background, spacing, alignment, and media references. No arbitrary HTML or CSS.
- Add media-library contracts for category, label, thumbnail, desktop/mobile sources, alt text, and focal position. This is the persistent CMS-ready interface only; no full editor or storage migration in Phase 1.

## Finder architecture
- Create reusable presentation primitives: `FinderShell`, `FinderStep`, `FinderProgress`, `FinderOptionCard`, and `FinderResultShell`.
- Keep separate state models and reducers:
  - eSIM: trip mode, destination, days, travelers, usage selections, and stable multi-route stops.
  - Lounge: stable airport/IATA, date, departure/transit/arrival, travelers, with optional terminal/flight-time readiness.
- eSIM single-destination UI: Destination → Days → Travelers → Usage.
- eSIM multi-route UI: preset/custom route → route stops → days/dates → travelers → usage → non-priced recommendation presentation.
- Model Sıla Yolu as a configurable route preset, not a product. Support add, remove, reorder, duplicate-safe validation, stable IDs, and graceful invalid/empty states.
- Lounge finder UI: Airport → Date → Flight situation → Travelers, using stable airport identity rather than free text alone.
- Finder results and product cards are display contracts only. No fake live prices or recommendation algorithm.

## Reusable sections and states
- Implement shared visual families for hero, service selector, recommendation, popular choices, pricing, benefits, complementary service, education/how-it-works, campaign, requirements, support, FAQ, final action, and footer.
- Keep eSIM and Lounge data schemas separate inside shared visual shells:
  - eSIM cards: destination/region, GB, validity, coverage, optional price/badge/action.
  - Lounge cards: flag, IATA, airport, terminal, lounge, optional hours/duration/amenities/price/availability/action; omit absent fields.
- Add context-aware complementary-service configuration that may render nothing when irrelevant.
- Add local loading, empty, error, and ready boundaries so one failed section cannot crash the page.
- Use subtle once-only lower-page reveals with reduced-motion support and lazy-load only below-fold imagery with fixed dimensions.

## Account, auth, and admin presentation
- Restyle login/register and add password-reset presentation without changing Phase 0 authentication or authorization.
- Make account travel-centric: “Seyahatlerim” first, clean no-trip state, reusable trip cards containing mixed service summaries.
- Preserve intended-route return after authentication; account navigation resolves to login when signed out and trips when signed in.
- Add a reusable protected Admin shell and visual building blocks for future sections, while retaining server-side role checks. Admin remains absent from all public navigation.

## Technical boundaries
- Preserve Phase 0 database tables, service/product models, provider adapters, pricing, orders/payments/fulfillment, trips, roles, analytics, audit, and server-only secret boundaries.
- Reuse existing product/service reads; empty catalogues render service-specific empty states rather than invented production data.
- Add only presentation/configuration modules and focused route/component updates. No new provider, payment, product, analytics, or transaction implementation.
- Keep routes semantically linked with TanStack navigation and route-specific metadata.

## Verification
- Add focused tests for URL normalization, service switching/reset, TR fallback, route-stop validation/add/remove/reorder, Sıla Yolu preset integrity, and media fallback selection.
- Browser-test eSIM and Lounge in TR/DE/EN; invalid service fallback; signed-out account routing; and empty product/trip states.
- Visually verify at 360, 390, 430, tablet, and desktop widths: header, hero, selector, both finders, route planner, cards, popular/pricing/cross-sell, account, language menu, and safe-area bottom navigation.
- Verify keyboard focus, labels, tap targets, alt text, reduced motion, no horizontal overflow, no broken media, and no public Admin/future-service exposure.

## Files and data
- Expected changes: global styles/tokens, public shell, i18n/content modules, typed service/media/section configuration, finder/state modules, shared customer sections/cards, homepage/eSIM/Lounge/auth/account routes, and protected Admin shell styling.
- Expected additions: optimized generated eSIM and Lounge hero assets plus service-specific fallbacks stored through the project asset flow.
- Database migrations: none expected. Phase 0 tables remain unchanged.

## Out of scope
- Live eSIM or Lounge providers, live catalog synchronization, recommendation algorithms, availability checks, payment, provisioning, QR/voucher delivery, Car Rental, Transfer, fake analytics, full CMS editor, and Phase 2.
