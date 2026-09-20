# eSIM carousel selection fix

## Scope
- Keep the existing premium swipe/orb design and the existing catalogue, pricing, cart, checkout, and recommendation logic unchanged.
- Reconnect every rendered purchasable package card to the existing shared `selectedProductId` state.

## Changes
- Make recommended, standard, unlimited, and broader-coverage product cards selectable as one radio group.
- Make each full swipe card keyboard- and tap-selectable, with a compact localized Select/Selected affordance.
- Track pointer movement so horizontal drag only scrolls the rail and does not select a product.
- Keep one selected visual state, and softly update the sticky purchase summary from that same selected product.
- Add lightweight 200–300 ms border/content transitions while respecting reduced-motion settings.

## Verification
- Test at 390 px: swipe without selection, then select standard, unlimited, and broader products.
- Confirm recommended loses only its selected state, the sticky summary follows every selection, and Add to cart receives the current product.
- Check keyboard radio interaction, no duplicate selected cards, no overflow, and no console errors.
