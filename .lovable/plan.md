# Controlled Travely Theme Editor

## Confirmed audit
- The public homepage already contains a visible `GUIDE_CAROUSEL` registry entry and renders the existing `V2GuidesRail` component in configured order.
- The public Guides query correctly requires both a published guide and a published locale translation, and limits the homepage rail to featured guides.
- The current database has no guide rows or published guide translations. This is why the component returns nothing; it is not excluded by homepage order, visibility, locale, or the section registry. No fake guide content will be added.
- The existing V2 Admin editor already provides safe section reuse, drag ordering, visibility, reset, drafts, explicit publishing, version history, media selection, translations, and real-page iframe previews for eSIM, Lounge, and Vignette.
- The existing Theme area already provides sanitized global colors, fonts, radii, shadows, draft/publish isolation, and history. The implementation will extend these systems rather than create a parallel CMS or rebuild public components.

## Implementation
1. **Guides availability and diagnostics**
   - Preserve the existing Guides component and strict published/featured/locale filters.
   - Surface the real empty-content condition in Admin so the reason the homepage rail is absent is explicit.
   - Add focused tests proving the homepage section appears when valid published featured content exists and remains absent for drafts or missing locale publications.

2. **Safe section design schema**
   - Extend the existing V2 section registry with optional, sanitized presentation settings only: width, spacing, background preset/custom color, radius, responsive typography, alignment, and a guarded 3×3 content-position preset for supported components.
   - Keep all settings optional. Missing settings resolve to the exact current Travely classes and layout.
   - Keep translated content separate from language-independent presentation settings; reject arbitrary CSS, HTML, JavaScript, transforms, margins, and absolute coordinates.

3. **Theme Editor experience**
   - Evolve Admin Theme into two clear areas: Theme Editor and Global Styles.
   - Add a page selector covering the currently safe reusable-section pages first: Homepage/eSIM, Lounge, and Vignette. List Guides, FAQ/Help, country destinations, and other public pages with their real management destination or a protected status instead of pretending their commerce/security layouts are freely reorderable.
   - Reuse the current section list for drag ordering, visibility, edit, per-section reset, and whole-page reset.
   - Add safe design controls and desktop/tablet/mobile values without mixing content translations into global theme data.

4. **Live draft preview**
   - Reuse the real public-page iframe preview rather than rebuilding a visual mock.
   - Add Desktop, Tablet, and Mobile modes and apply unsaved section settings and unsaved global theme variables only inside the isolated preview.
   - Keep customers bound only to published configuration; no automatic publication.

5. **Global style tokens**
   - Extend the existing centralized theme configuration with sanitized background/text/secondary colors, heading/body scales, section spacing, page width, button radius, and card radius.
   - Map these to shared CSS variables while retaining the approved Travely values as defaults.

6. **Verification**
   - Add sanitizer/default-fallback/section-order/visibility/preview-message tests.
   - Verify eSIM, Lounge, and Vignette at 360, 390, 430, 1280, and 1440 widths; verify TR/DE/EN/AR and Arabic RTL.
   - Confirm Guides behavior with valid published data through tests without inventing or publishing guide content.
   - Confirm catalogue, pricing, cart, checkout, orders, authentication, customer accounts, supplier integrations, SEO content, and product publication remain unchanged.

## Boundaries
- No redesign of Hero, Search, Popular Countries, Trust, Guides, FAQ, product sections, Lounge, Vignette, or Footer.
- No schema migration, security/RLS/role change, supplier sync or purchase, pricing change, package change, payment, order, provisioning, refund, SEO, or deployment publication.
- Existing public components stay authoritative; configuration only composes them and supplies safe optional presentation settings.
