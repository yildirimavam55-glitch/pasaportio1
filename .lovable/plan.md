# V2 desktop final visual polish

## Scope lock
- Keep the approved 1280px desktop container, mobile layouts, section order, colors, real data, business logic, and existing service identities unchanged.
- Make presentation-only changes at tablet/desktop breakpoints; do not alter catalogue, prices, cart behavior, payment, orders, provisioning, database, Admin, or publishing state.

## Implementation
1. **Homepage desktop proportions**
   - Keep the current hero image and search behavior; refine only desktop height, crop, typography, and text positioning within the requested 420–480px range.
   - Change the shared desktop photo rail so five or six full-size destination cards fit cleanly, while surplus real destinations remain reachable through safe horizontal scrolling and controls. Preserve the current mobile rail exactly.
   - Keep the regional section as the existing 3 × 2 desktop grid and retain the Worldwide banner unchanged.

2. **Compatibility and Lounge pair**
   - Reuse the existing compatibility checker and Lounge promotion in a desktop-only 50/50 row.
   - Give both sides matching height, balanced content, and aligned actions; leave the current stacked mobile presentation untouched.

3. **Installation desktop composition**
   - Keep the existing decorative, non-scannable animation and reduced-motion/off-screen behavior.
   - At desktop, use a balanced 40–45% visual / 55–60% content layout with a centered 280–340px phone visual.
   - Synchronize the visible desktop step list with the animation phase, use subtle state transitions and a slower 2–3 second cadence, while preserving the compact mobile version.
   - Keep the real installation guide link and truthful wording.

4. **Shared lower-page and service polish**
   - Normalize desktop section spacing without changing mobile spacing or content order.
   - Check Vignette, guides, FAQ, footer, Lounge, and Vignette pages against the same desktop rhythm and service accents; make only responsive presentation fixes where needed.
   - Keep guides at three desktop cards and FAQ at a readable line length.

5. **Country/package and cart presentation**
   - Verify the country page uses its existing real-product selection grid cleanly at desktop widths; adjust presentation only if clipping or excessive empty space is visible.
   - Verify a populated cart uses the existing products-left / summary-right layout, including quantity and removal, without changing cart behavior.

## Verification
- Run rendered checks at 390, 1024, 1280, 1440, and 1920px for width, clipping, duplicate search, navigation visibility, empty areas, and sticky/floating collisions.
- Exercise a safe real product in cart: one item, quantity change, and removal; do not enter payment or trigger purchase/provisioning.
- Verify build diagnostics and targeted tests.
- Capture real screenshots for 1440px eSIM, Lounge, Vignette, country/package, populated cart, a close installation-section view, and the 390px eSIM regression.
- Report each requested PASS/FAIL item and confirm no product, price, business-logic, database, or publishing changes.
