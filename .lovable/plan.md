# Premium Trust & Social Proof

## Goal
Add one new, compact trust section that closely follows the supplied mobile reference while remaining native to Travely’s approved homepage. Existing homepage sections and commerce flows remain unchanged.

## Homepage experience
- Place the section after the current eSIM discovery content and before regional package discovery, preserving all existing section order.
- Recreate the reference composition: soft cream/mint surface, neutral trust badge, two-line headline with green emphasis, supporting copy, integrated travel photograph, two subtle floating benefit chips, optional approved reviews, and a four-item trust bar.
- Keep mobile primary: balanced text/photo composition, readable chips, swipeable reviews, and a 2×2 trust grid when four columns would become too small. Desktop expands the same composition without becoming a different design.
- Use one new premium travel photograph with fixed responsive dimensions and lazy loading; the supplied mockup remains a visual reference only.

## Truthful public content
- Use a neutral badge such as “Für Reisende entwickelt” until real customer/order evidence supports a stronger statistic.
- Store the installation claim as editable content; do not silently derive or publish unsupported marketing wording.
- Limit refund wording to unused eSIMs.
- Show review cards publicly only when both verified and published. Hide the entire review rail when none qualify; never seed fake public reviews.
- Do not add unsupported network-performance or payment-method claims.

## Admin management
- Extend the existing V2 homepage CMS document, media picker, draft/version/publish workflow, and preview rather than introducing a second CMS or new tables.
- Add a dedicated “Trust & Reviews” section editor for enabled state, localized badge/headline/supporting copy, travel image and alt text, benefit chips, and all four trust-bar items.
- Add review management inside that section: add/edit/delete, avatar through the existing media library, customer first name and initial, destination, rating, localized review text, verified flag, published flag, and explicit display-order controls.
- Show TR/DE/EN completeness states and reuse the existing responsive/language preview.

## Localization and accessibility
- Provide TR, DE, and EN master content through the existing locale structures and static overlay translations for all other supported storefront languages.
- Preserve RTL behavior and existing fallback rules without mixed-language cards.
- Use semantic headings/lists, descriptive image alternatives, keyboard-accessible review scrolling, visible focus states, and screen-reader-friendly star labels.

## Motion and performance
- Reuse the existing one-time IntersectionObserver reveal pattern: opacity plus about 20px vertical movement, 450–650ms, small stagger, and no scroll listeners or animation dependency.
- Respect reduced motion by showing content immediately.
- Keep native page scrolling, prevent horizontal page overflow, reserve image space to avoid layout shift, and lazy-load below-fold imagery.

## Verification
- Compare the finished mobile section directly with the supplied reference for proportions, image placement, floating chips, reviews, trust bar, green accents, spacing, radius, and hierarchy.
- Test 360, 390, 430, tablet, and desktop widths; TR/DE/EN plus one long overlay locale and Arabic RTL; reduced motion; zero/one/multiple approved reviews; review swipe and keyboard controls; no horizontal overflow.
- Recheck country search, Popular Countries, the existing information carousel, regional packages, and the start of the purchase flow.
- Run focused tests, type checks, formatting checks, and confirm the preview build is healthy. Do not publish.
