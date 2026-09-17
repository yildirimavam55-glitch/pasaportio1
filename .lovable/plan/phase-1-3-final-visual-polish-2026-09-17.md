# Phase 1.3 — Final Visual Polish

## Goal
Polish the existing customer experience into a premium, trustworthy travel-commerce presentation while preserving every locked architecture and data contract.

## Customer-facing changes
- Remove remaining development-oriented wording and avoid repeating unavailable-product notices.
- Rebalance the page into image-led destination/lounge cards, a compact finder, visual recommendations, concise information, and a strong final action.
- Keep distinct eSIM and Lounge hero photography, with compact mobile framing and immediate access to service choice and finder.
- Upgrade usage choices, Sıla Yolu summary, lounge amenities, trust signals, and icons using the existing single icon family.
- Add polished, non-production delivery previews for eSIM QR/email and Lounge voucher/email without exposing or generating fulfillment secrets.
- Alternate controlled cream, white, mint/petrol tint, and image-led sections while keeping orange reserved for primary actions.

## Media and CMS readiness
- Extend the existing media contract for destination, airport/lounge, cross-sell, and educational imagery with category fallbacks, alt text, focal position, desktop/mobile support, and reserved dimensions.
- Keep merchandising data driven by service configuration so future Admin controls can change images, order, visibility, backgrounds, and icon presets without custom country components.
- Lazy-load all lower-page imagery; keep hero, selector, and finder eager.

## Technical details
- Refactor the public presentation into small reusable visual sections without changing finder state, service registry behavior, database, auth, orders, providers, or CMS foundations.
- Add semantic tint tokens and shared image/card utilities to the existing design system.
- Preserve one-time scroll reveal and reduced-motion behavior.
- Keep road-trip context suppression for Lounge cross-sell.

## Verification
- Run focused unit tests and strict TypeScript checks.
- Test both services and TR/DE/EN at 360, 390, and 430 pixels for overlap, overflow, first-screen clarity, image loading, route collapse, and delivery presentation.
- Confirm no live provider, payment, QR, or voucher integration was introduced.
