# V2 product selection and sticky purchase summary

## Scope
- Keep the approved V2 layout, catalogue queries, filtering, prices, IDs, cart store, checkout state, and bottom navigation unchanged.
- Add explicit selection before cart insertion for real eSIM country and regional package lists.
- Apply the same shared selection architecture to Lounge offers when real offers exist; keep Vignette’s current unavailable state untouched.

## Implementation
- Create shared V2 selection components with service variants for selected-card styling, check indicator, quantity controls, add/in-cart state, and cart navigation.
- Update country and regional eSIM cards so tapping selects exactly one product; keep the information icon as a separate details action.
- Build the sticky summary from the selected real product: data or Unlimited, validity, normalized country/region identity, price, and quantity.
- Add to the existing cart only from the summary. Reuse existing quantity limits and cart update behavior; never create a second cart state.
- Apply the same interaction to real Lounge results using only returned offer fields. Do not render a summary when no offers exist.
- Integrate the summary into the existing fixed action area above bottom navigation, with collision-safe WhatsApp placement and sufficient page bottom clearance.

## Verification
- Test Standard, Unlimited, and regional eSIM selection, replacement, quantity, add-to-cart, in-cart state, exact IDs/prices/identity, details access, and cart navigation.
- Test Lounge empty/real-offer behavior and confirm Vignette remains unavailable.
- Check TR/DE/EN at 360, 390, and 430 px for clipping, horizontal page overflow, WhatsApp/action/nav collisions, and safe final content scrolling.
- Confirm build passes and no catalogue, supplier, pricing, database, payment, provisioning, production, or publishing changes occurred.
