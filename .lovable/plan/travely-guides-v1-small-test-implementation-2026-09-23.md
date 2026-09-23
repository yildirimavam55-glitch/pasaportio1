# Travely Guides V1 — Small Test Implementation

## Goal
Create a small public Guides test experience using the existing Guides architecture only. Keep this focused: three published Turkish guides, the existing admin flow, existing guide routes/components, and one compact homepage strip.

## Scope
- Reuse the current Guides tables, functions, routes, admin screen, cards, and homepage strip.
- Seed only these three high-quality guides:
  1. Türkiye Seyahat Rehberi
  2. Yurt dışında ne kadar internet gerekir?
  3. Sıla Yolu Rehberi
- Ensure the public naming stays platform-wide:
  - TR: Rehberler
  - DE: Reiseführer / Ratgeber
  - EN: Travel Guides
- Add or reuse `/rehberler` as the localized Turkish entry point without replacing the existing `/guides` route.
- Keep the homepage addition compact and below the main commerce sections.

## Public experience
- Guide hub shows categories, compact mobile-first guide cards, photos, category labels, descriptions, reading time, and destination/route context where available.
- Guide detail pages show cover image, title, intro, updated date, structured sections, FAQ/related areas where the existing system supports them, and contextual service cards.
- Commerce CTAs appear only when existing active/published products are available through the current catalogue logic; no fake prices or availability.

## Data and content
- Use additive, non-destructive database inserts/updates only.
- Do not generate mass article content.
- Do not auto-create low-quality DE/EN translations. Missing translations should follow the existing fallback/non-index behavior.
- Use existing relation tables for countries, routes, services, and products where already supported; avoid locking the model to eSIM-only content.

## SEO
- Ensure published guide pages have slug, SEO title, meta description, OG title, OG description, and OG image support through the existing route metadata.
- Confirm draft/untranslated guides are not publicly indexed.
- Keep `/guides` and `/rehberler` discoverable without creating duplicate thin pages.

## Admin
- Keep using Admin → Rehberler.
- Verify create/edit/draft/publish/category/cover/SEO/relation fields remain connected to the existing data model.
- No second CMS, no redesign, no admin architecture changes.

## Explicitly not touched
- eSIM Go, catalogue sync, pricing, orders, provisioning, customer portal, authentication, payments, Lounge architecture, and global header/footer.

## Validation
- Check the database has exactly the three new published test guides for this V1 set.
- Check `/rehberler`, `/guides`, and each guide detail page render on mobile.
- Check homepage shows at most three published guides in the compact section.
- Check contextual CTAs are catalogue-backed and disappear when unavailable.
- Check build output after edits.
