# Phase 1.3 Roadmap

## Homepage finalization

- [x] Audit the actual homepage render, theme, catalogue, Finder, region, and campaign paths
- [x] Consolidate the eSIM homepage into one destination-first commercial sequence
- [ ] Verify theme persistence, customer journeys, TR/DE/EN, mobile/desktop, tests, and build

## Mobile homepage conversion UI update

- [x] Make the mobile eSIM hero destination-first without changing its search flow
- [x] Add the compact three-item trust strip and catalogue-backed swipe destinations
- [x] Place optional Finder, regional discovery, and Sıla Yolu promotion before supporting content
- [x] Verify TR/DE/EN customer journeys at 360/375/390/412/430 and desktop

## Optional homepage Finder entry

- [x] Replace the prominent homepage Finder with one compact optional assistant entry
- [x] Reuse the existing Finder unchanged when the assistant is opened
- [x] Verify direct Turkey package shopping and optional recommendation journeys at 360–1440 px in TR/DE/EN

## Controlled storefront UI/UX refinement

- [x] Apply the selected refined mobile travel-commerce direction without changing business logic
- [x] Correct verified homepage, package, cart, auth, navigation, image, and accessibility issues
- [x] Verify TR/DE/EN across mobile and desktop customer journeys

## Controlled homepage conversion correction

- [x] Keep the hero search primary and the shared sticky search compact and secondary
- [x] Reorder the eSIM homepage to trust → real-price destinations → existing Finder → education
- [x] Verify real catalogue pricing, Finder behavior, TR/DE/EN, and mobile/desktop layouts

## Travely Guides V1 small test

- [x] Add localized public `/rehberler` entry without replacing existing `/guides`
- [x] Publish exactly 3 Turkish test guides through the existing Guides tables
- [x] Keep guide CTAs catalogue-backed and avoid fake availability/prices
- [x] Verify mobile listing, article pages, homepage strip, SEO basics, and build status

## Sticky destination search — mobile UX

- [x] Compact sticky search bar appears under header after scrolling down (home + country/package pages)
- [x] Reuses existing QuickSearch data/routing — no second search system
- [x] Results scroll under open mobile keyboard; no layout jump; no overlap with floating purchase card
- [x] QA at 360/375/390/412/430 px, TR/DE/EN, light/dark
- [x] Critical sticky layer fix: search button never clips, results stay in the sticky overlay, and country routing still works

## Homepage popular eSIM destinations

- [x] Show real country destination cards first: TR, ES, IT, GR, EG, US, JP, TH when sellable
- [x] Hide unavailable priority countries and fill from PT, MV, TN, AE, CA, MX
- [x] Keep regional/global package cards in a separate regional package section
- [x] Verify each visible country card routes to its real package page and report live counts/prices

- [x] Preserve locked architecture and service state behavior
- [x] Add image-led destination, Lounge, and contextual recommendation sections
- [x] Upgrade compact usage, route, icon, and trust presentation
- [x] Add polished eSIM and Lounge delivery confidence previews
- [x] Remove customer-facing development wording
- [x] Verify both services and languages at 360, 390, and 430 pixels

## Phase 1.4 — Finder compaction + package purchase flow

- [x] Days + travelers side by side on mobile (360/390/430)
- [x] Compact finder, usage section higher
- [x] esim_usage_settings table + admin-configurable recommendation engine
- [x] Admin → Smart Finders → eSIM Recommendation with preview calculator
- [x] Estimated GB vs recommended GB shown separately + CTA
- [x] /esim/paketler results page with cart foundation, no fake products
- [x] Multi-route preserved via ?route=ISO,ISO
- [x] Lounge flight status segmented selection (no arrow/check icons)

## Phase 1.5 — eSIM device compatibility + lounge icons

- [x] Lounge flight status icons (takeoff / transfer / landing, no check or arrow markers)
- [x] "Telefonum eSIM uyumlu mu?" section under the eSIM finder
- [x] Brand → model → result checker sheet with model/alias search
- [x] Compatible / uncertain / not compatible result states with safe wording
- [x] Manual EID check guide + carrier/region disclaimer
- [x] Curated device catalogue table with admin management
- [x] Session-only compatibility state reused on /esim/paketler
- [x] Non-sensitive analytics events (no IMEI/EID/serial)
- [x] TR/DE/EN + 360/390/430 QA

## Phase 1.6 — Public customer flow correction

- [x] eSIM result card shows one need value (~X GB) + explanation
- [x] Real recommended package block (catalogue-driven) with Önerilen badge + Sepete Ekle
- [x] Orange Paketleri Gör CTA → /esim/paketler with full finder state
- [x] Lounge CTA → /lounge/secenekler (airport, IATA, date, situation, travelers)
- [x] /lounge/secenekler results page + clean empty state
- [x] Lounge flight status: mint selected state, takeoff/transfer/landing icons
- [x] Rendered QA at 360/390/430 (no overflow, no console errors)

## eSIM result area visual correction

- [x] Compact usage intensity selector and two-column usage grid
- [x] Compact estimated-need bar separated from recommendation
- [x] Mint real-product recommendation card with catalogue price and explanation
- [x] Clean catalogue-pending recommendation state without fake pricing
- [x] Preserve Finder selections in package-page navigation
- [x] Rendered QA at 360/390/430 and public deployment verification

## Catalogue-backed eSIM selection

- [x] Filter recommendation products by published, visible, available, and margin-safe catalogue state
- [x] Preserve stable recommended product ID through the package-page handoff
- [x] Preselect the exact recommendation and allow one alternative selection
- [x] Add the exact selected catalogue snapshot to cart
- [x] Verify rendered Finder and package page at 360/390/430

## Test catalogue (INTERNAL_TEST)

- [x] is_test + source columns on service_products
- [x] showTestCatalogue feature flag (kill switch, OFF before launch)
- [x] 10 eSIM + 3 Lounge demo products seeded
- [x] Admin > Test kataloğu: filter, enable/disable, duplicate, delete, DELETE ALL TEST DATA
- [x] Cart snapshot with is_test + DEMO QR placeholder at /sepet

## Catalogue-backed customer merchandising

- [x] Remove the generic non-action package-options section
- [x] Derive popular eSIM destination starting prices from published catalogue rows
- [x] Add package CTAs to popular eSIM destination and route cards
- [x] Keep Finder recommendation and pricing strictly catalogue-backed

## Service switch transition

- [x] Guard repeated eSIM/Lounge switch taps
- [x] Keep the application shell visible with no full-screen loading surface
- [x] Animate the service-selector pill and transition Hero/Finder locally
- [x] Use shared SIM-card and airplane service icons at equal visual weight
- [x] Respect reduced-motion preferences
- [x] Preserve Finder viewport position across service switches and smooth-scroll bottom navigation only when needed
- [x] Add premium reveal-once motion, short card staggers, and immediate Finder-result feedback
- [x] Slow customer motion to calm premium timings while preserving Finder position and reduced motion
- [x] Use one shared CMS-editable Hero and isolate service switching to the stable Finder anchor

## Icon alignment and compatibility layer polish

- [x] Normalize core customer icon boxes, SVG size, and stroke weight
- [x] Align Lounge flight-status icons and mobile bottom navigation
- [x] Add compatibility-only dimmed backdrop and adaptive sheet/modal surface
- [x] Polish mobile Finder selection typography, selected hierarchy, and icon consistency
- [x] Mobile usage option buttons: icon inline, no check, 15px/600, mint/petrol selected state, all labels fit at 360px
- [x] Mobile Lounge options: complete labels, simplified icons, clear date placeholder, and unbroken bottom navigation text
- [x] Preserve scroll locking, close cleanup, and reduced-motion behavior

## Real provider eSIM import

- [x] /admin/esim/provider-import: provider kaydı, JSON katalog önizleme ve diff
- [x] Idempotent import (provider_raw_items, service_products, esim_product_details, mappings, sync run, audit)
- [x] Fiyat kuralı, marj koruması ve MARGIN_BELOW_MINIMUM uyarısı
- [x] Kaybolan provider ürünleri UNAVAILABLE (silinmez)
- [x] Test paketlerini gizle: showTestCatalogue kapalı + INTERNAL_TEST PAUSED

## Admin Phase B — Business dashboard + analytics + attribution

- [x] /admin is the business dashboard (date presets + custom range, comparison period)
- [x] KPI cards with revenue / provider cost / fees / discounts / refunds / gross contribution kept separate
- [x] Revenue, orders and gross contribution over time charts
- [x] Sales by service (eSIM / Lounge), traffic source performance, first/last touch
- [x] Campaign performance table (UTM based, existing traffic_attribution reused)
- [x] Finder funnel with conversion and drop-off + filters (date, service, country, destination, source, campaign, language)
- [x] eSIM / Lounge / route / cross-sell analytics foundations
- [x] Top products, top travel destinations vs customer countries
- [x] "Dikkat gerektirenler" alert counts + last provider import summary (import engine untouched)
- [x] Test catalogue orders excluded from production dashboard; zero-data empty states

## Admin V2 — Business Control Center

- [x] Audit current admin routes and data surfaces
- [x] Redesign global admin shell and grouped navigation
- [x] Add General / eSIM / Lounge dashboard contexts
- [x] Complete requested operational and management views using existing data
- [x] Verify access control, responsive layouts, tests, and no fake data

## Final customer-facing package QA

- [x] Verify current source and published eSIM/Lounge journeys
- [x] Fix only confirmed package presentation and purchase-flow failures
- [x] Re-test TR/DE/EN and 360/390/430 mobile layouts
- [x] Publish and verify the production URL

## Mobile-first eSIM/Lounge homepage redesign

- [x] Warm cream/petrol/mint/orange tokens verified; compact spacing utilities
- [x] Compact mobile header + service-aware 4-item bottom navigation
- [x] Compact shared eSIM + Lounge hero with service-neutral trust chips and orange CTA
- [x] eSIM/Lounge segmented selector directly under hero
- [x] eSIM finder: dynamic country title, compact trip/days/travelers/usage layout
- [x] eSIM: dark petrol estimated-usage bar + mint recommended package card
- [x] Lounge finder: compact airport/date/situation/travelers + dark petrol summary CTA
- [x] Lounge result card mock data interface and UI render (data-driven, no hard-code)
- [x] Playwright QA at 360/390/430: no overflow, correct service switching, backend logic intact

## eSIM katalog bölümleri (tamamlandı)

- Tüm paketler tedarikçi kataloğundan gelir; storefront'ta mock/hard-coded paket listesi yok.
- Ürünler provider + provider ürün kimliğine göre tekilleştirilir.
- Her ürün tek bir kategoriye girer: Önerilen > Sınırsız > Daha geniş kapsam > Standart.
- Render sırası: Önerilen, Standart, Sınırsız, Daha fazla ülke kapsayan.
- Güvenlik kontrolü + sayaç invariantı ve 10 otomatik test eklendi.

## eSIM sonuç sayfası — premium swipe tasarımı

- [x] Referans görsele uygun mobil sonuç sayfası yönünü netleştir
- [x] Önerilen kartı ve üç açık swipe bölümünü mevcut katalog sınıflandırmasına bağla
- [x] Hafif ülke görsel eşlemesi ve generic fallback ekle
- [x] Sticky sepet çubuğunu bottom navigation üzerinde güvenli konumlandır
- [x] TR/DE/EN ve 360/375/390/412/430 px doğrulaması yap

## eSIM paket carousel seçimi

- [x] Tüm gerçek paket kartlarını tek `selectedProductId` state'ine bağla
- [x] Kartın tamamında tap ve klavye seçimini destekle
- [x] Swipe hareketinin yanlışlıkla seçim yapmasını engelle
- [x] 390 px seçim, sticky bar ve sepete ekleme akışını doğrula

## Sınırsız paket kürasyonu (tüm ülkeler)

- [x] Sınırsız bölümü yalnızca seçilen ülkeye özel paketleri gösteriyor
- [x] Geçerlilik kovalarına göre en mantıklı 3 seçenek (fiyat koruması dahil)
- [x] Her kartta kapsam satırı (bayrak + ülke / ülke sayısı) ve fair-use yıldızı
- [x] Kart başına "Detaylar" alt sayfası (veri tipi, fiyat, süre, kapsam, 5G, hotspot, aktivasyon, fair-use)
- [x] TR/DE/US/JP 390 px doğrulaması: tekrar yok, taşma yok, konsol hatası yok
- [x] Sınırsız bölümünde sağlayıcının sunduğu her gerçek süre tek kart olarak listeleniyor
- [x] Seyahat süresine uyan kart "Bu seyahate uygun" rozetiyle vurgulanıyor
- [x] Ayrı "Diğer bölgelerde sınırsız" alt rafında en fazla 2 geniş kapsamlı alternatif

## eSIM sonuç sayfası görsel düzeltmeleri

- [x] Bölüm başlıklarının üst boşluğunu ve scroll payını güvenli hale getir
- [x] Standart orb kartları ve yatay ray aralıklarını dengele
- [x] Sınırsız kartlarda rozet, başlık, bilgi ikonu ve içerik hiyerarşisini ayır
- [x] Seçili kart görünürlüğünü güçlendir
- [x] Sticky sepet ve alt menü için safe-area uyumlu sayfa alt boşluğu ekle
- [x] 360/375/390/412/430 px görünüm, swipe ve seçim doğrulaması

## Travely public mobile visual redesign

- [x] Shared Hero, header, service selector ve bottom navigation görsel dilini uygula
- [x] eSIM/Lounge finder ve uyumluluk alanını Vibrant Editorial yönde sadeleştir
- [x] eSIM paketlerini orb görünümden okunabilir swipe kartlarına taşı
- [x] Lounge sonuçlarını güçlü ilk kart ve kompakt seçeneklerle yeniden düzenle
- [x] TR/DE/EN için 360/375/390/412/430 px etkileşim ve görünüm doğrulaması

## Travely clean mobile commerce

- [x] Select Modern Utility Minimalism as the shared eSIM/Lounge direction
- [x] Move the shared service selector and primary entry flow above mobile promotional content
- [x] Simplify the Lounge finder and connect its CTA directly to real published results
- [x] Add Standard/Unlimited package segmentation, compact two-column product cards, quantity controls, and live sticky summary
- [x] Add recommended/alternative Lounge selection with a sticky purchase summary
- [x] Verify TR/DE/EN at 360/375/390/412/430 px and resolve any visual/runtime regression

## Direct eSIM purchase flow (country → plan → cart)

- [x] Service-aware quick search on the home screen (country for eSIM, airport for Lounge)
- [x] Country selection goes straight to the package page
- [x] Long eSIM assistant moved behind an optional link
- [x] Direct catalogue mode on the package page (no usage box, no auto recommendation)
- [x] Quantity and sticky purchase bar appear after a real selection
- [x] Verified TR/DE/EN at 360–430px, tests and build passing

## Service-specific Travely hero

- [x] Add original eSIM connectivity and Lounge comfort imagery
- [x] Use one shared mobile hero structure with service-specific TR/DE/EN copy
- [x] Place the existing country/airport quick search inside the hero
- [x] Keep the service switch below the hero and preserve existing commerce behavior
- [x] Verify both services at 360/375/390/412/430px

## Mobile search focus mode

- [x] Hide the service selector and secondary content while country/airport search is open
- [x] Collapse the mobile hero to header, search input, and autocomplete results
- [x] Preserve active service and restore the selector after close, blur, submit, or selection
- [x] Verify eSIM and Lounge flows at 360/390/430px
- [x] Make full eSIM and Lounge result lists independently scrollable with keyboard-aware mobile height

## Compact product-led eSIM + Lounge hero

- [x] Apply the selected Commerce Hero Refinement direction using Travely tokens
- [x] Use product-explicit eSIM connection and airport Lounge imagery
- [x] Keep the country/airport search overlaid inside a compact 340px mobile hero
- [x] Add concise TR/DE/EN service-specific copy without changing search or service logic
- [x] Verify both services and search focus mode at 360/390/430px

## Country-specific eSIM card motifs

- [x] Add a reusable country-code to subtle motif mapping with a safe fallback
- [x] Show motifs only on exact single-country cards while retaining flag and country name
- [x] Remove large photography from regional/global cards and use neutral coverage iconography
- [x] Verify local and broader cards across countries at 360/390/430px

## Mobile bottom navigation single-active state

- [x] Derive one active item from pathname and the explicit finder URL target
- [x] Keep plain homepage visits Home-active even when eSIM is the default service
- [x] Use URL-backed eSIM/Lounge finder targets and clear the target on Home
- [x] Verify Home, eSIM, Lounge, Account routing, and browser Back at 360/390/430px

## Compact eSIM package page

- [x] Apply the selected dense comparison direction with Travely tokens
- [x] Replace product rails with compact two-column grids and no horizontal scrolling
- [x] Keep whole-card selection, details sheet, subtle country motifs, and neutral broader coverage cards
- [x] Show six Standard products first and expand remaining catalogue products in the same grid
- [x] Verify tabs, selection, quantity, cart consistency, TR/DE/EN, and 360/375/390/412/430px

## Country symbol card system

## Real-photo country discovery

- [x] Add one immutable real destination photo for every current sellable single-country ISO
- [x] Use one central photo registry across homepage, all-countries, and package destination header
- [x] Keep regional cards abstract and package comparison cards photo-free
- [x] Add lazy loading, fixed image dimensions, localized alt text, and future-country fallback
- [x] Complete catalogue counts, broken-image checks, and 360–430px visual QA

- [x] Centralize symbolic, minimal single-country, and neutral multi-country presentation modes
- [x] Keep mapped country motifs subtle and remove decorative fallback motifs for unmapped countries
- [x] Retain localized flag and country name on every single-country Standard and Unlimited card
- [x] Keep multi-country products image-free and landmark-free with neutral globe treatment
- [x] Verify mapped, unmapped, and multi-country cards at 360/375/390/412/430px

## Complete country symbol coverage

- [x] Extract all currently published single-country storefront ISO codes
- [x] Add one centralized visual registry entry for every current supported country
- [x] Render reusable low-contrast inline SVG motifs for Standard and Unlimited local cards
- [x] Preserve neutral multi-country cards and future-safe unknown-country fallback
- [x] Verify registry coverage, build, and 360/390/430 px representative countries

## Final homepage conversion polish

- [x] Compact the mobile hero while preserving its image, copy, and embedded search
- [x] Remove the eSIM package assistant and compatibility blocks from the homepage sales path
- [x] Keep country search navigating directly to Standard / Unlimited and live catalogue prices
- [x] Move compatibility and the secondary package-assistant link below the product grids
- [x] Verify the complete purchase path at 360/390/430 px

## Complete global destination system (catalogue-driven)

- [x] `listEsimDestinations` server function derives destinations from published, customer-visible, provider-available products (no hard-coded country list, no storefront section.items as source).
- [x] Homepage eSIM discovery: coverage-region cards + max 8 popular countries + "Tüm ülkeleri gör" CTA.
- [x] `/esim/ulkeler`: every sellable single-country destination, localized search (name/ISO/aliases), region chips, paginated rendering, lazy images.
- [x] One visual identity per ISO reused on homepage, all-countries page and package header (`CountryScene`); regions use abstract coverage graphics (`RegionScene`).
- [x] Real starting prices from the catalogue minimum sale price; no hard-coded prices.
- [x] Country landmark motifs removed from package cards; multi-country cards stay neutral.
- [x] Validation: 191 sellable ISOs = 191 destination cards = 191 visuals, 0 missing, 0 duplicates; tests in `src/components/travel/destinations.test.ts`.

## Global compact country product pages

- [x] Apply one compact image, identity, benefits, selector, and product-grid structure to every sellable single-country destination
- [x] Remove the duplicate local Standard/Unlimited headings and descriptions after the selector in TR/DE/EN
- [x] Add catalogue-derived local product counts and one clearly sliding active selector state
- [x] Minimize repeated country identity inside local package cards while preserving broader-coverage context
- [x] Verify all sellable destinations and representative countries at 360/375/390/412/430px

## Real customer eSIM account and secure sign-out

- [x] Audit customer eSIM ownership, order/fulfillment/provider flow, usage/status/top-up capabilities, and current account/logout implementation
- [x] Build the authenticated account service center from real `customer_esims` rows with active/history grouping and multiple-instance support
- [x] Normalize statuses and calculate bounded usage/expiration only from stored or provider-backed values; show honest unavailable states otherwise
- [x] Add owner-only QR/install actions and capability-gated top-up or buy-again actions without exposing sensitive payloads
- [x] Add localized, visible sign-out with error handling, cache teardown, protected-route redirect, and back-navigation safety
- [x] Validate zero-state, fixed/unlimited, expired/exhausted, capability states through tests, plus the live TR account at 360/390/430px; real one/multiple-instance provider states remain blocked by absent fulfillment rows

## Final UX and commerce pass

- [x] Add persisted Light / Dark / System appearance controls and complete dark tokens
- [x] Preserve the compact header while adding the missing signed-out menu action
- [x] Remove the redundant homepage campaign banner without changing destination discovery
- [x] Unify eSIM and Lounge sticky purchase bars above mobile navigation
- [x] Refine the real-catalogue cart summary and remove fake payment-success output
- [x] Validate TR/DE/EN at 360/375/390/412/430px and report integration blockers honestly

## Mobile final UI correction

- [x] Default new visitors to Light while preserving explicit Light / Dark / System choices
- [x] Remove the fixed mobile bottom navigation and its reserved spacing
- [x] Convert eSIM and Lounge purchase summaries into compact floating cards above the safe area
- [x] Keep product, quantity, and total synchronized without advertising unverified payment brands
- [x] Verify theme persistence, navigation, selection, totals, overflow, and safe areas at 360/375/390/412/430px

## Homepage eSIM — three-step guide

- [x] Add a compact three-step eSIM explanation after destination discovery
- [x] Add touch scroll-snap cards and a synchronized mobile progress indicator
- [x] Reuse the existing device compatibility checker and add a concise trust row
- [x] Keep installation and activation wording accurate across TR/DE/EN
- [x] Verify Light/Dark, swipe, compatibility CTA, and 360/375/390/412/430px layouts

## Homepage eSIM — three-step visual polish

- [x] Replace placeholder phone drawings with one consistent Travely product mockup system
- [x] Show package selection, easy installation, and connected states with localized UI
- [x] Compact the step cards and compatibility prompt without changing copy or behavior
- [x] Verify Light/Dark, TR/DE/EN, swipe, next-card preview, and 360/375/390/412/430px layouts

## Homepage destination regression

- [x] Preserve live catalogue destination cards whenever sellable products exist
- [x] Restore the existing three-card homepage selection when the live catalogue is empty
- [x] Keep unverified prices hidden and preserve existing destination routing
- [x] Verify homepage cards, sticky search, and following sections on mobile and desktop

## Mobile menu overlay layering

- [x] Mobile menu backdrop/panel sit above header and sticky search
- [x] Sticky destination search hides (and unmounts) while the menu is open, returns on close
- [x] No background scroll while menu is open; scroll position preserved
- [x] QA at 360/375/390/412/430 px

## Customer Portal V1 (/account)
- [x] Account shell + navigation (mobile cards, desktop sidebar), sticky search hidden
- [x] Overview, eSIM'lerim (+ detail), Siparişlerim (+ detail)
- [x] Profil, Güvenlik, Bildirimler, Destek
- [x] Ownership-scoped server functions (no IDOR), real data only
- [x] Reference screenshot: UX inspiration only — no demo data, no bottom nav
- [x] QA 360/375/390/412/430 + tablet/desktop, TR/DE/EN

## Customer Portal UI refinement (cards)
- [x] Active/pending eSIMs as swipeable carousel with dots + next-card peek (mobile), 2-col grid (desktop)
- [x] Past eSIMs as compact history rows instead of full cards
- [x] Track width fix (grid-auto-columns calc, not minmax) verified at 360–430 px, TR/DE/EN
- [x] Multi-card scenarios tested (1/2/5 active, 2 ready) with temporary test rows, then cleaned up

## Travely Guides V1 (public surface)
- [x] /guides hub: categories, quick filters, published guides, TR/DE/EN copy
- [x] /guides/$slug article page: breadcrumbs, meta, TOC, sections, FAQ + FAQ structured data, contextual service offers
- [x] Country guide hubs by localized country slug (e.g. /guides/turkiye) with real catalogue-backed offers
- [x] Homepage strip "Seyahatini kolaylaştıran rehberler" below the primary flow (hidden until featured guides exist)
- [x] Admin Guides management (/admin/guides) + navigation link
- [x] XML sitemap endpoint (/sitemap/xml; literal /sitemap.xml path not generatable by the file router)
- [x] Typecheck + build OK; Playwright: hub, country hub, not-found, sitemap, homepage
- [ ] Publish first real guides (intentional, high-quality content only — no auto-generated thin content)

## Admin Phase 1 — Catalog safety + pricing + storefront governance (done)
- [x] Explicit `esim_auto_publish` flag (default FALSE), absence no longer means publish-all
- [x] Default pricing rule in DB (ESIM, 35%, NEAREST_99, priority 1000), hardcoded fallback removed
- [x] Safe pricing failure: `pricing_review_required`, no auto price/publish, never sells at cost
- [x] Price traceability via `pricing_snapshot` + `priced_at` + existing price history
- [x] Abnormal catalogue drop guard (configurable %, default 20) + CATALOGUE_DROP_BLOCKED alert
- [x] Low-balance threshold field + de-duplicated LOW_PROVIDER_BALANCE alert + safe balance read
- [ ] Set a real low-balance threshold value (business decision, pending)

## Admin Phase 2 — Security + audit log (done)
- `esim_auto_publish` / Phase 1 architecture untouched. eSIM Go `low_balance_threshold` = 100 EUR (provider config, admin-editable).
- Low-balance alerts deduped across manual balance refresh + sync (shared `needsLowBalanceAlert` rule).
- Existing `log_admin_action` audit path wired into: admin role invite/revoke/cancel, provider create/import/test-catalogue hide, usage settings, device compatibility, test product publish/unpublish; guide publish/unpublish; provider balance/sync/cancel (pre-existing direct inserts fixed — they were silently blocked by RLS).
- Secret redaction (`redactSensitive`) applied to every audit payload.
- `getBusinessDashboard` enforces admin server-side (`assertAdmin`), as do provider hub + import functions (defense in depth with RLS).
- Verified live: 2 balance checks → 2 audit rows, exactly 1 OPEN LOW_PROVIDER_BALANCE alert; non-admin calls rejected server-side.

## Admin Phase 3 — eSIM commerce + provisioning engine (done, no live supplier order)
- Additive migration: `provisioning_status` enum, `provisioning_units` table (UNIQUE order_item_id+unit_index, UNIQUE idempotency_key, admin-only RLS read), `customer_esims.provider_reference`, `alert_type` SUPPLIER_RESULT_UNKNOWN, flag `commerce.test_payments` (false), UNIQUE index on `orders.idempotency_key`.
- Domain: `src/domain/commerce/provisioning.ts` (validation, state machine, unit planning, failure classification, eSIM Go normalisation, audit redaction) + `engine.ts` (store/supplier ports, provisionUnit/provisionOrder/reconcileUnit).
- Server: `commerce.server.ts` (authoritative order creation + snapshots, SQL store, adapter-backed supplier port), `commerce.functions.ts` (customer order request; admin-only test payment confirm, run, retry, reconcile, list).
- Adapter: existing eSIM Go adapter gained `placeEsimOrder` (single POST, never auto-retried) + `fetchEsimOrder` (read-only reconciliation); new `postJsonOnce` money-path helper.
- Admin UI: `ProvisioningPanel` added below the existing eSIM fulfillment operations view (no redesign); no QR/ICCID/credential shown.
- Live supplier purchases gated on server switch `COMMERCE_LIVE_PROVISIONING` (unset = off). Real eSIM Go orders placed: 0.
- [ ] First live € supplier test — needs eSIM Go balance top-up (currently 0 EUR), payment integration, and explicit approval.
