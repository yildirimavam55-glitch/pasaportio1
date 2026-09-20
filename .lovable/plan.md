# Real customer eSIM account and secure sign-out

## Scope
Build the existing `/hesabim` page into a real, authenticated service center without changing catalogue sync, recommendation, pricing, cart, admin, or existing public routes.

## Implementation
- Add authenticated server functions that explicitly scope every customer query to the signed-in user, even though row-level security already applies.
- Load the customer profile, purchased eSIM instances, lounge bookings, and orders from the existing database tables with bounded, cache-friendly queries.
- Keep sensitive QR and installation payloads out of the account-list response; load one eSIM's activation details only after its owner opens that action.
- Normalize stored eSIM statuses into active/history groups and calculate usage percentages only when real total and remaining values exist. Clamp displayed percentages to 0–100 and show an honest unavailable/updating state otherwise.
- Detect unlimited packages and fair-use details only from stored purchase/provider metadata. Never invent allowance, remaining data, expiration, status, or provider usage.
- Build a compact TR/DE/EN account hub with profile identity, active/history eSIM cards, lounge bookings, orders, settings link, manual refresh, last-update time, and zero/one/multiple states.
- Use mobile swipe cards with one full card and the next edge visible; use a responsive desktop grid. Show only valid actions: owner-only QR/install, provider-capability-gated top-up/extension, or buy again.
- Add a localized customer sign-out confirmation and failure message. On success, cancel requests, clear cached/private screen data, sign out, replace history with `/`, and rely on the protected route gate to block `/hesabim`.

## Honest capability boundaries
- The current provider connection is catalogue-only: payment, provisioning, live status/usage, QR delivery, top-up, and extension calls are not implemented.
- The account will faithfully render future real `customer_esims` rows, but it will not create demo rows or present unsupported provider actions as working.
- Manual refresh will refresh the customer's stored records. Provider-backed refresh remains visibly unavailable until a provider usage endpoint exists.

## Verification
- Add focused tests for owner scoping, status grouping, usage clamping, unlimited/fair-use handling, active/history rules, and action capability rules.
- Verify the real empty account and secure logout end to end with an authenticated session when available.
- Verify TR/DE/EN and 360/390/430 px layouts, including no overflow and no sensitive values in logs or list responses.
- Report PASS / FAIL / BLOCKED separately for account data, QR/install, live usage sync, top-up/extension, fulfillment chain, and logout.
