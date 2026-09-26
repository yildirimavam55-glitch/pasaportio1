# V2 Country Product Page Reference Implementation

## Goal
Match the approved mobile product-page reference for every selected country while preserving the existing catalogue, pricing, selection, product details, cart, compatibility data, routing, and language architecture.

## Page structure
- Replace the current country search pill and plain title with a compact dynamic country hero using the existing country photo registry, localized country name, existing region classification, country flag, and a controlled readability overlay.
- Add a compact four-item trust strip directly below the hero using only verified Travely benefits already supported by the storefront.
- Place the existing compatibility checker below the trust strip in a compact horizontal state card. Reuse the session-confirmed model/status, show verified compatible or incompatible states only, and otherwise open the existing checker.
- Keep the existing Standard/Unlimited filtering and real counts, but style the tabs and package heading to match the approved reference hierarchy.
- Keep the current two-column package cards, whole-card selection, one selected checkmark, real product order/prices, and unchanged details modal.
- Replace the large two-card decision section with one compact recommendation row that opens the existing package assistant.
- Replace the embedded installation animation with one compact row linking to the existing installation guide.
- Keep one compact regional/global discovery row after the package grid.
- Add a compact product-page FAQ after the three supporting rows, using verified conditional wording and the existing accordion/i18n system.

## Sticky purchase area
- Keep the existing cart store, quantity limits, add operation, and selected-product behavior.
- Restyle the selected-product summary to match the reference: flag, package/validity, country, quantity, price, and one primary CTA that changes from Add to cart to Go to cart.
- Keep the bar hidden when nothing is selected and preserve the existing WhatsApp/bottom-navigation collision handling.

## Localization and responsive behavior
- Add TR/DE/EN source copy through `localize()` so all configured overlay languages continue using the current global translation resources and fallback behavior.
- Preserve manual language precedence and existing country search behavior.
- Use one controlled desktop container and the same content order rather than stretching the mobile layout.
- Ensure readable two-column cards and collision-free fixed controls at 360, 390, and 430px, plus the approved hierarchy at 1440px.

## Technical boundaries
- Make presentation changes only in the V2 country page and shared V2 product-summary/compatibility presentation where required.
- Do not alter catalogue queries, supplier APIs, product eligibility, product order, prices, pricing rules, cart semantics, checkout, payment, provisioning, Admin, or publication state.
- Record the stable architecture rule that country-product pages reuse the central country photo registry and existing commerce/checker systems.

## Verification
- Exercise country hero, compatibility states/checker, both package tabs, select/deselect, details modal, regional row, recommendation flow, installation link, FAQ, quantity, Add to cart, and Go to cart.
- Regression-check country search, language switching, cart persistence, compatibility persistence, and installation route.
- Check TR/DE/EN at 360, 390, 430, and 1440px for overflow, clipping, and fixed-control collisions.
- Run focused tests plus the full test suite; confirm the preview build is healthy.
- Capture the requested 390px top, selected-package, FAQ/sticky-bar, and 1440px screenshots. Do not publish.
