# Phase 1.3 Roadmap

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
- [ ] Re-test TR/DE/EN and 360/390/430 mobile layouts
- [ ] Publish and verify the production URL

## Mobile-first eSIM/Lounge homepage redesign

- [ ] Warm cream/petrol/mint/orange tokens verified; compact spacing utilities
- [ ] Compact mobile header + service-aware 4-item bottom navigation
- [x] Compact shared eSIM + Lounge hero with service-neutral trust chips and orange CTA
- [ ] eSIM/Lounge segmented selector directly under hero
- [ ] eSIM finder: dynamic country title, compact trip/days/travelers/usage layout
- [ ] eSIM: dark petrol estimated-usage bar + mint recommended package card
- [ ] Lounge finder: compact airport/date/situation/travelers + dark petrol summary CTA
- [ ] Lounge result card mock data interface and UI render (data-driven, no hard-code)
- [ ] Playwright QA at 360/390/430: no overflow, correct service switching, backend logic intact

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
