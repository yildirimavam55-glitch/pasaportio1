# V2 eSIM Results Final Simplification

## Build
- Keep the approved V2 shell, imagery, typography, bottom navigation, and Lounge/Vignette pages unchanged.
- Extend the existing read-only package result shape with the catalogue's real intended country field. Use it to split exact-country products from broader products that merely cover the destination.
- Deduplicate only customer-identical entries in memory; preserve every database row and choose a stable real product record for the visible card.
- Add Standard and Unlimited tabs with exact visible counts. Show every matching country package in one compact two-column mobile grid, sorted by allowance/duration and then price.
- Replace inline technical details with a compact bottom sheet containing real package facts and the existing add-to-cart mapping.
- Show at most three clearly regional alternatives after the country grid, without repeating a full size ladder.
- Move the optional package assistant below the package choices. Its recommendation will point to one real package without filtering the full catalogue.
- Keep compatibility, installation, data education, real guides, Lounge/Vignette discovery, FAQ, and the existing real footer links below shopping.
- Keep destination control compact after selection; retain the shared restrained WhatsApp/cart dock with reserved bottom space.

## Technical details
- Reuse `listEsimPackages`, catalogue country intent, normalized package scope, existing pricing fields, usage estimator, compatibility data, guide queries, cart store, sheets, and V2 shell.
- No writes, migrations, catalogue synchronization, supplier calls, purchases, payment calls, or production route changes.
- Validate exact card counts against the computed country result arrays; validate cart lines against source package IDs and prices.

## Verification
- Report Türkiye technically covered, exact-country Standard, and exact-country Unlimited counts.
- Test Türkiye, Germany, Italy, USA, and Japan; Standard/Unlimited counts; 2–3 regional alternatives; detail sheet; multiple add-to-cart selections.
- Inspect the full eSIM page in TR/DE/EN at 360, 390, and 430 px for overflow, German wrapping, destination obstruction, WhatsApp overlap, density, swipe affordance, and footer.
- Confirm every V2 page remains `noindex, nofollow`, absent from the sitemap, and unpublished.