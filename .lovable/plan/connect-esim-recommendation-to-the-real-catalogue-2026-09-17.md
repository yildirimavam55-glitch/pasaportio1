# Connect eSIM recommendation to the real catalogue

## Scope
- Preserve the existing Finder, recommendation-card design, navigation, and calculation logic.
- Change only catalogue eligibility, Finder-to-package handoff, package selection, and exact cart snapshots.

## Implementation
1. Tighten the existing catalogue read to return only published, customer-visible, provider-available, margin-safe eSIM products with a positive current sale price, plus the stable internal product ID and available provider reference.
2. Keep the existing matcher: full destination/route coverage and sufficient validity first, then the smallest allowance meeting the calculated need, with current sale price as the tie-breaker.
3. In the existing recommendation card:
   - show a short skeleton while catalogue products load;
   - render the matched real product when available;
   - otherwise show the clean localized no-suitable-product state, never a synthetic package or price;
   - make the primary action open `/esim/paketler` with the stable recommended product ID and all current Finder context.
4. Extend `/esim/paketler` search state with `recommendedProductId`, retain the existing usage fields, and load all eligible real products for the destination or complete route.
5. Preselect the exact recommended product, style it with the existing mint/petrol recommended treatment, scroll it into view once when needed, and allow the customer to select any other real product.
6. Make one page-level “Add to cart” action add only the currently selected catalogue product, including its internal ID, provider reference, current price/currency, allowance, validity, and coverage snapshot.
7. Add focused tests for eligibility and stable-ID selection, then verify the rendered Finder and package page at 360, 390, and 430 px.

## Current catalogue state
- The connected catalogue currently contains no eSIM product rows. The production UI will therefore show the clean empty state until real products are imported; it will switch automatically after sync without code changes.
