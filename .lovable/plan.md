# V2 Storefront Builder — Phase 1 (eSIM / Lounge / Vignette homepages)

## Finding
A storefront builder already exists for the old storefront: section list with draft/publish, version history, restore, media library, theme tokens, navigation editor, TR/DE/EN text, protected sections, server-side admin checks and audit log (stored in the existing CMS documents). The V2 pages do not use it yet — their content is written directly in code.

Decision: extend this builder to V2. No parallel CMS, no new tables expected.

## What gets built

### 1. Admin → Storefront area
One hub with tabs: Overview, Pages, Navigation, Sections (library), Media, Theme, Translations (missing-text overview per language). Existing Media, Theme and Navigation screens are reused and linked in.

### 2. Pages
Page list: eSIM homepage, Lounge homepage, Vignette homepage (editable this phase). Country package page, Cart, Account, Support, Installation guide are listed as "coming next" (read-only) — no core route can be deleted.

### 3. Section editor per page
Ordered list with move up/down, drag-and-drop, show/hide, edit, duplicate (content sections only), reset to default. Search/finder section is protected: can be edited for presentation, never removed.

New V2 section types added to the existing registry: SEARCH_HERO, BENEFIT_ROW, DESTINATION_CAROUSEL, REGION_DISCOVERY, PROMO_BANNER, INSTALLATION_STEPS, GUIDE_CAROUSEL, TRUST_ROW, SPACER (plus existing FAQ, IMAGE_TEXT, CTA, COMPATIBILITY).

- Hero: images (mobile/desktop), eyebrow, headline, subtitle, search placeholder/label, alignment, overlay (presets), height (compact/normal/tall).
- Benefit row: add/remove/edit/reorder/hide items; icon from approved icon list only.
- Popular destinations: pick real countries/regions/airports from the catalogue; prices always come from live pricing.
- Promo banners: title, subtitle, image, CTA text, internal destination, start/end date, visibility.
- Installation: headline, subtitle, step labels, CTA, animation variant preset.
- FAQ / guides: editable items.
- Coupon block: prepared but disabled with "no active coupon engine" — no fake discounts.

### 4. Migration of current V2 look
Default configs mirror today's V2 exactly (current texts, icons, order, images). If nothing is published, or data is invalid, V2 renders these defaults — so BEFORE = AFTER, and a bad edit can never break the page.

### 5. Draft → Preview → Publish
Editor shows a live phone/desktop preview of the draft using the real V2 components. Save draft, Publish, version history (who/when/what), rollback. Public pages read only published config, loaded once server-side per page.

### 6. Safety
Server-side validation of every field, tags stripped, internal links only, no CSS/HTML/JS fields. Prices, products, cart, search logic, supplier, orders, payment, provisioning, auth stay code-owned.

### 7. QA
Headline change, hero image replace, hide/reorder benefit, hide/reorder/restore section on all three pages; TR/DE/EN; 360/390/430/desktop; visual before/after comparison; business regression (searches, sticky search, package selection, prices, cart, admin auth); typecheck, all tests, build. No publish.

## Technical notes
- Extend `STOREFRONT_SERVICES` with `v2_esim`, `v2_lounge`, `v2_vignette`; stored as `storefront_v2_*` documents in `cms_documents` (existing draft/published/versions flow).
- New V2 section renderers wrap existing V2 components (TrustRow, sticky search, V2Installation, GuidesRail, FAQ) and receive config props; defaults extracted from current code.
- Published config fetched in the route loader via existing `getPublishedStorefront`; editor code never ships to customer pages.
- Media delete guard: check usage across all storefront documents before allowing delete.
- Out of scope this phase: country page, cart/account/support pages, bottom nav behavior (labels only), real coupons.
