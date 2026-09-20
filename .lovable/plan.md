# Compact eSIM Package Page

## Goal
Make the existing eSIM package page a fast two-column comparison experience while preserving all catalogue, classification, pricing, selection, cart, checkout, routing, admin, and language behavior.

## Changes
- Compress the country heading and compatibility action so tariffs begin higher on mobile.
- Keep the 50/50 Standard and Unlimited control, with each tab replacing the same grid area without reloading.
- Render local Standard and Unlimited products as 110–135px whole-card selectable tiles showing only data type, price, validity, details icon, and selected check.
- Show the first six local Standard products initially; expand any remaining products inside the same grid through translated “show all” copy without removing catalogue items.
- Keep country motifs subtle on exact-country cards; use only neutral globe treatment for regional/global products.
- Convert every customer product section to a normal two-column grid at mobile and multi-column grid at larger widths; remove horizontal overflow and swipe behavior.
- Preserve the existing bottom details sheet and sticky selected-product/cart bar, with safe bottom spacing.

## Validation
- Confirm Standard and Unlimited switching, card selection, details sheet, quantity changes, and sticky-cart consistency.
- Verify representative countries and TR/DE/EN at 360, 375, 390, 412, and 430px with no horizontal overflow or clipped data/price text.
- Run the existing eSIM catalogue tests and confirm the preview build is healthy.
