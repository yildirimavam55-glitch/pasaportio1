# V2 regional eSIM discovery and results

## Scope and safeguards
- Replace only the V2 homepage Global Unlimited card rail with compact regional discovery directly after Popular Destinations.
- Preserve the approved hero, sticky country search, popular cards, remaining homepage order, country results, product IDs, prices, cart/checkout identity, and existing Unlimited deduplication.
- Use only published, customer-visible, provider-available, non-flagged real catalogue rows. No sync, database write, price/rule change, supplier purchase, payment, provisioning, Admin, production route, or publish action.

## Real catalogue audit
- Classify eligible multi-country products from their stored package scope, real coverage, and normalized supplier region metadata; never infer a region from the customer’s prior country search.
- Produce a server-side regional summary for every genuinely available region: Standard and Unlimited counts, lowest storefront prices, total eligible products, and coverage variation.
- Show an exact country count only when the region’s eligible products have a consistent representative coverage; otherwise show the localized “Multi-country” label.
- Keep Worldwide separate from ordinary regions and expose its compact banner only when supported by published inventory.

## Homepage
- Add the localized compact heading, title, and lead exactly as requested.
- Render real available region groups as premium photo cards using the existing bundled region photography, localized names, truthful coverage label, and lowest real sale price.
- Use a native scroll-snap rail showing about 1.4–1.7 cards at 390 px, with no page overflow and a normal compact row on wider screens.
- Replace the three large Worldwide Unlimited product cards with one compact Worldwide banner showing the real maximum coverage and cheapest eligible Worldwide Unlimited sale price.
- Keep Device Compatibility immediately after this regional block; do not add another large section.

## Regional results
- Extend the existing `/design-v2/esim` experience with a typed region search state, keeping country and region intent mutually exclusive.
- Reuse the current package cards, detail sheet, add-to-cart snapshot, cart, and checkout. Regional queries return only products whose real normalized regional identity matches the selected region and whose scope is regional/global as appropriate.
- Default to Standard. Show Standard and Unlimited tabs only when those types exist; include real counts in the result tabs.
- Standard options use the existing customer-visible deduplication rule and order by data allowance, validity, then price. Unlimited uses the already approved deduplication unchanged and orders by duration, then price.
- Regional header, coverage, detail, full covered-country list, network generation, and localized identity all come from the selected product’s real metadata. Raw supplier names remain hidden.
- Worldwide opens the same regional results experience and only shows catalogue types that genuinely exist.

## Verification
- Record the final audit for every real region, including both counts, both lowest prices, homepage price, and coverage behavior.
- Test homepage swipe, Europe Standard/Unlimited, one product detail and cart add from each tab, cart and checkout identity, browser back, and Worldwide in TR/DE/EN at 360/390/430 px.
- Confirm zero country-only leakage, zero regional-to-country mislabeling, no clipping/page overflow/fixed-control overlap, sticky search remains functional, build health, V2 noindex, no production change, and no publication.
