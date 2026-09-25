# V2 final customer experience completion

## Scope and safeguards
- Work only inside the existing `/design-v2` customer preview and preserve the approved mobile visual direction.
- Reuse the existing catalogue, pricing, cart, recommendation, device compatibility, guides, account, Auth, support, and checkout systems.
- Do not publish or change production routes, database rows, catalogue records, prices, supplier mappings, Admin, Auth logic, orders, customer eSIMs, payments, or supplier operations.

## Implementation
1. **Curated eSIM storefront**
   - Replace the raw destination result list with the existing deterministic customer shortlist engine.
   - Show 2–5 real, meaningfully distinct choices, preferring exact-country coverage and preserving each real product ID through cart insertion.
   - Keep network, validity, coverage, data, and price labels strictly catalogue-backed; never expose supplier identifiers or a “show all” catalogue action.

2. **Guided package selection and education**
   - Add a compact V2 usage assistant using the existing stored usage settings and calculator for trip days and real usage types.
   - Use the calculated need only to highlight one explainable real package when sufficient input exists.
   - Add compact data-usage education, real device compatibility checking, and truthful installation guidance without guaranteed QR, delivery, or activation claims.

3. **Complete discovery content**
   - Keep the reference-locked hero, selector, benefit row, destination swipe, compact spacing, and five-item bottom navigation.
   - Arrange eSIM sections in the requested shopping-first sequence, with Lounge and Vignette discovery cards, published guide cards, FAQ, and a compact footer.
   - Reuse existing published guide queries and locale fallback; load only a small featured set and lazy-load card images.

4. **Truthful Lounge and Vignette depth**
   - Expand Lounge with airport discovery, service information, honest no-inventory messaging, eSIM discovery, and relevant real guides—without prices or amenities unless backed by a published offer.
   - Expand Vignette with a clear not-for-sale state, compact educational content, cross-service discovery, and relevant real guides—without fake countries, prices, validity, or purchase controls.

5. **Shared customer consistency**
   - Keep Cart, Checkout, Auth, Account, My eSIMs, Orders, Profile, Security, Notifications, and Support on the existing shared V2 shell.
   - Keep WhatsApp restrained in the shared action area and ensure it never covers interactive content or the bottom navigation.

## Verification
- Test Türkiye as the primary case, record its backend eligible count, and verify the 2–5 visible products, exact coverage, real prices/data/validity, stable product IDs, and cart mapping.
- Repeat shortlist checks for Germany, Italy, USA, and Japan without country-specific hard-coding.
- Exercise country/airport selectors, immediate filtering, vertical scrolling, destination and guide horizontal swipes, assistant recommendation, compatibility results, FAQ, and browser navigation.
- Inspect complete eSIM, Lounge, and Vignette pages at 360, 390, and 430 px in Turkish, German, and English, including long German copy, footer, bottom navigation, and WhatsApp clearance.
- Check runtime, console, network, and build signals; confirm no production, database, catalogue, pricing, Auth, Admin, sync, supplier purchase, payment, order, or customer-eSIM changes occurred.