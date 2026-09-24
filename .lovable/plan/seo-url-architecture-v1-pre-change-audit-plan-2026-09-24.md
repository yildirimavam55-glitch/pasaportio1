# SEO URL Architecture V1 — Pre-change audit + plan

## 1. Pre-change audit (current state)

Database: 4 guides. Only 3 are PUBLISHED, all Turkish only. No DE/EN translations exist.

| CURRENT URL | TYPE | LANG | CURRENT CANONICAL | PROPOSED FINAL URL | REDIRECT |
|---|---|---|---|---|---|
| /tr/esim/turkiye-seyahat-rehberi | DESTINATION | TR | self | /tr/esim/turkiye | YES |
| /guides/turkiye-seyahat-rehberi | DESTINATION (legacy) | TR | /tr/esim/turkiye-seyahat-rehberi | /tr/esim/turkiye | YES |
| /tr/rehber/yurt-disinda-ne-kadar-internet-gerekir | HOW_TO | TR | self | unchanged | NO |
| /guides/yurt-disinda-ne-kadar-internet-gerekir | HOW_TO (legacy) | TR | /tr/rehber/... | /tr/rehber/yurt-disinda-ne-kadar-internet-gerekir | YES |
| /tr/rehber/sila-yolu-rehberi | ROAD_TRIP | TR | self | unchanged | NO |
| /guides/sila-yolu-rehberi | ROAD_TRIP (legacy) | TR | /tr/rehber/... | /tr/rehber/sila-yolu-rehberi | YES |
| /guides | Hub (legacy) | TR | none | /tr/rehber | YES |
| /rehberler | Hub (legacy) | TR | none | /tr/rehber | YES |
| /guides/{country-slug} (auto country hub, e.g. /guides/turkiye) | Country hub | TR | /guides/{slug} | stays only if no final page exists; /guides/turkiye → /tr/esim/turkiye | YES for turkiye only |
| /tr/rehber/istanbul-esim | CITY | TR | DRAFT, not public | unchanged (goes live when published) | NO |
| /tr | Homepage | TR | self | unchanged | NO |
| /de, /en | Homepage | — | 404 today | new, reuse same homepage with DE/EN locale | NO |

Mapping check: every legacy URL has exactly one semantically matching final URL. No unrelated URL goes to the homepage. Unknown `/guides/...` slugs keep returning 404.

## 2. What will be built

- **Country slug fix:** rename the Turkey destination slug from `turkiye-seyahat-rehberi` to `turkiye` (slug field only; content untouched). Link it to country TR.
- **Localized homepages:** `/de` and `/en`, reusing the existing homepage exactly like `/tr` does.
- **Guide hubs:** `/tr/rehber`, `/de/ratgeber`, `/en/guides`, reusing the existing guides listing. Only PUBLISHED content in that language. Sections shown only when they have content: Destinations, City guides, eSIM guides, Travel internet guides, Newest, Popular. DE/EN hubs show an honest empty state (no fake translations).
- **Hub texts editable:** hub title / description / H1 stored in the existing SEO settings (admin Content → SEO), with the defaults you gave.
- **Permanent redirects (301, direct, no chains):** all rows marked YES above, also old slug `/tr/esim/turkiye-seyahat-rehberi` → `/tr/esim/turkiye`.
- **Canonical:** every final page self-canonical; hubs self-canonical; query params stripped from canonical as today.
- **Hreflang:** only between translations that are actually PUBLISHED, plus x-default. Currently TR only.
- **Breadcrumbs:** localized visible breadcrumb (Ana Sayfa → Rehber → X, Ana Sayfa → eSIM → Türkiye; DE/EN equivalents) with matching BreadcrumbList JSON-LD.
- **Internal links:** guide cards, related guides, breadcrumbs, homepage guides strip, back-links and hub links switch from `/guides/...` to final localized URLs.
- **Sitemap:** remove `/guides` and `/rehberler`; add `/tr`, `/tr/rehber` (and `/de`, `/en`, `/de/ratgeber`, `/en/guides` only once they have published content); keep published + indexable articles/destinations/cities.

## 3. Not touched

Supplier catalog, Finder, checkout, cart, auth, admin (except the hub text fields), pricing, orders, eSIM provisioning. No new articles, cities or translations.

## 4. Verification

Local + production after publish: `/tr`, `/de`, `/en`, three hubs, `/tr/esim/turkiye`, published article, city route behavior, every redirect (single 301 hop), canonical, hreflang, BreadcrumbList, sitemap, internal links; 360/390/430 mobile; regression on homepage, Finder, packages, cart, checkout, login, account; full test suite + build. Final report with PASS/FAIL and content-readiness YES/NO.

## Technical details

- Redirects via route `beforeLoad` `throw redirect({ href, statusCode: 301 })` in `guides.index`, `rehberler.index`, `guides.$slug` (resolve slug → localized path server-side) and `tr.esim.$slug` for old-slug aliases (small static alias map in `src/domain/seo/paths.ts`).
- New route files: `de.index.tsx`, `en.index.tsx`, `tr.rehber.index.tsx`, `de.ratgeber.index.tsx`, `en.guides.index.tsx` sharing one `SeoGuideHub` component.
- Slug rename via migration `UPDATE guide_translations SET slug='turkiye'` + `guides.country_iso='TR'`.
- Hub copy: new keys in the existing SEO settings table with fallbacks in code.
