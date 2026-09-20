# Travely public mobile visual redesign

## Scope
- Apply the approved Vibrant Editorial Mobile direction to the existing public homepage, eSIM finder/results, Lounge finder/results, shared header/footer, and mobile navigation.
- Preserve Provider API, supplier catalogue and sync, recommendation/classification, pricing, selection, cart/checkout, auth, admin, service controls, publishing, i18n infrastructure, routes, CMS bindings, and current service-switch/state behavior.
- Use the supplied mockups as visual references, not static templates; no new mock product data, heavy animation libraries, or extra API requests.

## Shared mobile experience
- Refine the public shell into a compact travel-shopping header and four-item safe-area bottom navigation using the existing controls and route behavior.
- Recompose the shared CMS-managed Hero with stronger editorial typography, travel imagery, concise service-neutral copy, and a large destination-search affordance that leads into the existing finder without changing its data flow.
- Keep the eSIM/Lounge selector immediately before the finder, with the existing 600ms pill and scroll-position preservation.
- Rebalance below-fold storefront sections into soft pastel bands, image-led cards, and clear consumer-travel hierarchy while retaining CMS content and links.

## Finder and compatibility
- Compact the shared finder shell and controls while keeping destination, days/date, travelers, usage, intensity, airport, flight situation, and state persistence unchanged.
- Keep all important labels at 14px or larger and prevent truncation at 360px, including German labels.
- Present eSIM compatibility as a prominent lavender editorial block with the existing checker sheet and analytics behavior.
- Restyle the Lounge finder and its existing result preview with clearer flight controls, image-led hierarchy, amenities, price, and CTA.

## eSIM package results
- Keep the fixed order: Recommended, Standard, Unlimited, Broader Coverage, with all existing classification and curation results unchanged.
- Replace the circular/orb treatment with compact editorial swipe cards using the existing CSS scroll-snap rails and drag-safe single selection state.
- Retain country-aware imagery/fallback, fair-use and details access, selected state, sticky cart synchronization, and safe bottom spacing.
- Keep every section open and ensure partially visible adjacent cards communicate swipe without clipping text.

## Lounge results
- Restyle the existing catalogue-backed Lounge result route into one stronger recommended-style first card followed by compact option cards.
- Keep the existing airport/date/situation/traveler query and cart behavior unchanged; do not invent availability, products, or prices.

## Motion and performance
- Reuse IntersectionObserver reveals, existing service transition timing, lazy images, CSS/Tailwind, and scroll-snap only.
- Animate opacity and small transforms with calm 900–1200ms section reveals; reduced motion remains immediate.

## Verification
- Test TR/DE/EN at 360, 375, 390, 412, and 430px for overflow, clipping, text truncation, image loading, service-switch position, finder readability, package swipe/selection, sticky cart, bottom navigation, and Lounge readability.
- Confirm selected product, visible selected card, sticky bar, and Add to Cart remain identical; verify no console/runtime errors and a healthy preview build.
