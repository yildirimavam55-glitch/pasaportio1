# Complete country symbol coverage

## Goal
Give every currently sellable single-country eSIM destination its own subtle, reusable vector motif while leaving catalogue, classification, pricing, selection, cart, checkout, authentication, admin, routes, and translations unchanged.

## Implementation
- Add one central country-visual registry covering the 191 unique single-country destinations currently published in the storefront catalogue.
- Use a consistent set of lightweight original inline SVG line/silhouette motifs, with explicit per-country motif metadata and placement/tone variants in the registry.
- Keep regional/global/multi-country cards neutral with the existing globe treatment.
- Keep a clean flag-and-name fallback only for future provider country codes not yet registered; emit a development warning without crashing production.
- Reuse one motif definition per country across all Standard and Unlimited package cards.

## Validation
- Store the programmatically extracted current storefront ISO snapshot and test it against the registry.
- Fail automated tests when any current supported ISO lacks a mapping; keep runtime future-code handling safe.
- Verify DE, TR, JP, FR, US, GB, IT, ES, GR, AE, TH, BR, and AU at 360, 390, and 430 px for overflow, text obstruction, selection, and missing artwork.
- Report supported count, mapped count, and missing count.

## Technical details
- Presentation logic remains centralized in the country visual module; product-card components only consume the resolver and motif renderer.
- Motifs are inline SVG/CSS, transparent, low-contrast, and decorative (`aria-hidden`), so there are no per-product image requests.
