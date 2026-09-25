# V2 approved-reference visual lock

## Scope
- Keep all work under `/design-v2`; production routes, data, pricing, Admin, suppliers, payments, and business rules remain unchanged.
- Preserve the existing V2 customer system and transaction/account screens; refine only the shared discovery presentation and selectors.

## Implementation
1. **Shared discovery layout**
   - Remove the duplicate top service switcher from discovery pages.
   - Tighten the shared hero, benefit row, horizontal cards, promotion card, three-step row, and bottom navigation to match the approved 390px proportions.
   - Keep the current five-item bottom navigation: eSIM, Lounge, Vignette, Sepet, Hesabım. This avoids a duplicate “Ana Sayfa” destination until a genuine overview page exists.
   - Add service-specific visual accents inside the shared V2 shell: petrol for eSIM, bronze for Lounge, deep blue for Vignette.

2. **Real-data selectors**
   - Add one reusable mobile selection sheet/panel.
   - eSIM: derive selectable countries and starting prices from the published catalogue, with flag, localized name, immediate filtering, scrolling, and selected state.
   - Lounge: reuse the existing airport directory; filter by city, airport name, and IATA. Show prices only if a published Lounge offer exists.
   - Vignette: retain an honest unavailable selection state because there is no product inventory.

3. **Discovery content**
   - Preserve real catalogue-backed destination cards and horizontal swipe.
   - Keep truthful benefit wording and corrected three-step copy.
   - Keep compact reusable cross-service photo cards without inventing commercial claims.

4. **Verification**
   - Compare rendered eSIM, Lounge, and Vignette pages against the supplied reference at 390px.
   - Check selectors, immediate filtering, scrolling, real prices, selection routing, TR/DE/EN, and horizontal overflow at 360/390/430px.
   - Verify preview-only noindex behavior and confirm production/database/Admin remain untouched.
