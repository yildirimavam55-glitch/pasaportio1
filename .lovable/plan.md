# Country Symbol Card System

## Goal
Make exact single-country eSIM cards feel locally distinctive without affecting catalogue, classification, pricing, selection, cart, checkout, authentication, admin, routes, or translations.

## Changes
- Replace the current generic fallback motif with an explicit presentation resolver: mapped single-country cards are symbolic, unmapped single-country cards are minimal, and multi-country cards are neutral.
- Keep one central country-to-motif configuration for the approved countries and make unknown country codes return no decorative element.
- Keep the same compact two-column card grid, selection behavior, details sheet, price, validity, data amount, and selected check in both symbolic and minimal modes.
- Show the localized flag and country name on every exact-country Standard and Unlimited card, including minimal fallback cards.
- Keep regional, Europe, global, and other multi-country products image-free and landmark-free, with neutral globe/coverage treatment only.
- Preserve the existing country heading and all current business behavior.

## Technical details
- Add a small presentation API next to the central motif map so rendering code never contains scattered country checks.
- Render no empty motif wrapper or broken asset when a mapping is unavailable.
- Keep decorative symbols hidden from assistive technology and below the text contrast hierarchy.

## Validation
- Verify symbolic local cards for DE, JP, FR, and TR in Standard and Unlimited tabs.
- Verify an unmapped country renders a polished flag-and-name card with no decorative motif.
- Verify regional/global products remain neutral with no country landmark or photo.
- Check selection, details, sticky cart consistency, text overflow, and alignment at 360, 375, 390, 412, and 430px.
- Run the existing catalogue tests and confirm the preview build remains healthy.
