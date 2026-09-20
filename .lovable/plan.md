# Travely clean mobile commerce redesign

## Scope
- Apply the selected Modern Utility Minimalism direction to the public eSIM homepage/finder, eSIM package results, Lounge finder/results, shared header, service selector, sticky purchase areas, and mobile navigation.
- Preserve Provider API, supplier catalogue and sync, recommendation/classification, pricing, cart/checkout, auth, admin, service controls, CMS bindings, routes, and current state-preserving service transition.
- Reuse Travely’s warm cream, petrol, mint, lavender/sky, and orange tokens; do not copy reference branding, logos, colors, wording, or products.

## Shared mobile flow
- Keep one stable shared entry area with the eSIM/Lounge segmented selector and one service-aware country or airport control.
- Reduce repeated headings, explanatory copy, decorative surfaces, and deep forms so the next action is visually immediate.
- Retain the four-item mobile navigation, selected-service state, safe-area spacing, and 600–800ms opacity/translate transitions with reduced-motion support.

## eSIM
- Keep the existing global country and multi-route logic, but make the default single-country path visually direct: destination, plan, buy.
- Present compatibility as a wide lavender utility strip before package selection.
- Add a clear Standard/Unlimited segmented presentation while retaining the existing mutually exclusive catalogue sections, local-unlimited duration curation, and broader alternatives.
- Restyle real products as compact two-column mobile cards with full-card selection, mint/petrol selected treatment, country coverage, duration, price, and details access.
- Keep one selected product, traveller-based quantity, live sticky summary, cart synchronization, and all current catalogue fallbacks.

## Lounge
- Simplify the existing airport/date/traveller/flight-status controls into a compact selection panel with one clear search action.
- Present the first real published Lounge as the stronger recommended card and remaining real options as compact selectable cards.
- Add a single selected-Lounge state and sticky purchase summary connected to the existing cart behavior; do not invent ratings, amenities, availability, or pricing.

## Technical details
- Modify presentation code and semantic design tokens only; add no heavy UI or motion dependency and no extra API request.
- Add all new TR/DE/EN labels to the existing local copy structures.
- Preserve generic ISO/coverage and airport/provider behavior without country- or airport-specific business rules.

## Verification
- Verify eSIM and Lounge flows in TR/DE/EN at 360, 375, 390, 412, and 430px.
- Check no horizontal overflow, clipped German labels, broken images, duplicate product rendering, accidental swipe selection, sticky-bar overlap, or console/runtime errors.
- Confirm service switching preserves position and finder state, and selected product/Lounge stays synchronized with the purchase summary and cart action.
