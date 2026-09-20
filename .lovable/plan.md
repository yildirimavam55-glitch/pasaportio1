# Travely final UX and commerce pass

## Goal
Preserve the approved Travely design and every existing catalogue, pricing, account, admin, routing, and language flow while completing the mobile shopping experience shown in the reference video. Never present unavailable payment, provisioning, usage, QR, top-up, or Lounge fulfillment capabilities as live.

## Verified starting point
- Header, TR/DE/EN language menu, mobile navigation, compact service-specific hero, service selector, scrollable country/airport search, catalogue-backed destination pages, Standard/Unlimited grids, cart selection, Lounge results, account hub, and secure logout already exist.
- eSIM and Lounge sticky summaries exist, but need safer shared bottom spacing and clearer selected-product details.
- Dark color tokens exist, but there is no Light/Dark/System preference control or persisted system-aware theme application.
- The cart is browser-local and the current “checkout” is explicitly a demo. No real payment provider, order creation, webhook, supplier provisioning, usage sync, QR delivery, top-up, or Lounge reservation write path exists.
- Stripe is the eligible built-in payment provider. Enabling it requires explicit confirmation and the seller’s registered country before tax handling can be finalized.

## Phase A — Safe UX completion now
- Add a persisted Light / Dark / System theme controller inside the existing mobile menu, defaulting to System. Apply it before paint and keep the published Travely theme tokens authoritative.
- Complete dark semantic tokens for warm cream, petrol, mint, orange, lavender, overlays, shadows, cards, dialogs, search results, sticky bars, account surfaces, and destination pages; do not change the brand direction.
- Keep the compact header structure as logo + language + account + menu. Preserve all current menu links and logout behavior; add a localized sign-in link when signed out.
- Keep the current compact service-specific hero and embedded search. Remove only a confirmed redundant promotional banner from the published homepage sequence; do not remove destination discovery, regional packages, all countries, or operational content.
- Preserve the one-active eSIM/Lounge selector and direct country-to-package flow. Keep the already-fixed keyboard-aware, independently scrollable search list.
- Refine eSIM and Lounge sticky purchase bars to share a safe-area-aware offset above bottom navigation, show the selected real product/airport, duration or guest count, live total, and quantity controls without overflow.
- Make add-to-cart lead directly to the concise cart summary where appropriate, while retaining real catalogue snapshots and maintenance checks.
- Refine the cart into a short, localized checkout summary with product, quantity, unit price, total, and restrained trust text. Keep it explicitly non-live until a provider is enabled; remove no existing safety disclosure.
- Preserve the real account dashboard and honest unavailable states for provider-backed data.

## Phase B — Real payments after confirmation
- Enable Lovable-managed Stripe in test mode only after explicit approval.
- Use the confirmed seller country to choose the correct tax path. Never infer it.
- Create Stripe products/prices from the real Travely catalogue mapping; no hard-coded plans or amounts.
- Implement checkout and verified webhook handling, then write real orders, order items, and payment transactions idempotently.
- Render only payment methods actually returned as available by Stripe Checkout. Apple Pay and Google Pay remain environment-dependent; PayPal is shown only if the enabled integration truly supports it.

## Phase C — Fulfillment only when supplier capabilities exist
- Add paid-order fulfillment only after a provider supports real ordering/provisioning. Populate `customer_esims` or Lounge bookings only from verified provider responses.
- Add success, QR/install, usage, top-up, renewal, and reservation states only when backed by supplier data. Existing eSIM Go access is catalogue/read-only, so these remain blocked rather than mocked.

## Validation
- Test 360, 375, 390, 412, and 430 px in TR/DE/EN for header, menu, theme modes, hero height, search with reduced visual viewport, service switching, long country names, package tabs, card selection, quantity changes, sticky-bar/navigation separation, cart summary, account, and logout.
- Verify Light, Dark, and System on homepage, eSIM destinations/results, Lounge results, cart, auth, account, sheets, dialogs, and empty/error states.
- Exercise the real flows: homepage → Türkiye → Standard/Unlimited → package → cart; Lounge search → option → guest quantity → cart; login → account → provider-backed states → logout.
- Report payment methods, usage fields, fulfillment capabilities, and blockers as PASS, FAIL, or BLOCKED based only on verified live integrations.
