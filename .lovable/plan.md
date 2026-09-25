# V2 becomes the main storefront + Vignette in Admin

## What you will get
- Visitors on the normal addresses (home, /tr, /de, /en, eSIM, Lounge, Vignette, cart, support, sign-in, account) see the new V2 design.
- The old design stays in the project, reachable only at a hidden `/legacy-v1/...` address for admins, never indexed and never in the sitemap.
- Admin gets Vignette as its own service next to eSIM and Lounge: overview, products (honest "0 products" empty state), a service control with a "Coming soon / not for sale" state, and the Vignette storefront editor.
- Nothing is faked: no Vignette or Lounge products are created, and eSIM prices, products, orders and customer data stay untouched.

## Rollback point
Before the switch I record the current state in the change history (you can restore it from there) and keep every old page file. Switching back = pointing the public addresses at the old pages again (one small file per address), see "Rollback" below.

## Address plan (existing SEO addresses kept)

```text
Public address          Before (V1)             After
/  and /tr              old home                V2 eSIM home (TR)
/de, /en                old home                V2 eSIM home (DE / EN)
/esim                   old eSIM                V2 eSIM home (+ ?country=)
/esim/ulkeler, /paketler old lists              V2 eSIM home (search opens)
/lounge                 old Lounge              V2 Lounge
/vignette (new)         -                       V2 Vignette (not for sale)
/esim/bolge/$region     -                       V2 regional packages
/sepet                  old cart                V2 cart
/destek                 old support             V2 support
/auth                   old sign-in             V2 sign-in / register
/account/...            old account             V2 account
guide + country eSIM SEO pages                  unchanged (already shared)
/design-v2/...          V2 preview              permanent redirect to the public address
/legacy-v1/...          -                       old pages, admin-only, noindex
```

Canonical, hreflang, structured data and sitemap stay on the existing public addresses; the "preview / noindex" tags are removed from V2 only when shown on public addresses. `/vignette` is added to the sitemap only when Vignette is on sale (not now).

## Links, sign-in, language
- V2's internal link mapper is reversed: every V2 link (logo, bottom nav, search, cards, cart, checkout, sign-in, account, guides, support, footer, language switch) points to public addresses.
- Language: `/tr`, `/de`, `/en` set the language; the other pages keep the visitor's chosen language as today.
- Sign-out, sign-in return, forgot/reset password and admin redirects return to public V2 addresses.

## Vignette as a real service
- Database: add `VIGNETTE` to the service list (one tiny, additive change — nothing existing is modified, no records added). Add two service switches `storefront.vignette` and `checkout.vignette`, both OFF, plus a "coming soon" mode.
- Code: replace every "if eSIM, else Lounge" shortcut with explicit eSIM / Lounge / Vignette handling; Vignette is never treated as Lounge.
- Vignette can't be added to the cart until real products exist and checkout is switched on (checked on the server too).

## Admin
- Menu grouped as: Dashboard · Services (eSIM, Lounge, Vignette) · Commerce (Orders, Pricing, Customers) · Content (Storefront, Guides, Media) · System (Service controls, Alerts, Audit log, Settings) — reusing existing pages.
- Admin → Vignette: Overview (status, products, countries, orders, availability) and Products (country, provider, validity, vehicle category, cost, price, status) reading real data only → shows 0.
- Service controls: third card for Vignette with Active / Paused / Coming soon.
- Storefront editor already has a Vignette page; it will now edit the public page.

## Checks
Typecheck, all tests, build; new tests for public → V2, legacy isolation, Vignette service config and not-for-sale rule, admin-only access, service controls. Browser checks at 360/390/430 on the public addresses (search, sticky search, destinations, regional, package select/deselect, Standard/Unlimited, cart, sign-in, account, Lounge, Vignette) and admin pages with the admin account; anything I cannot run in the browser is reported as NOT TESTED. Not published.

## Technical details
- Public route files (`index`, `tr/de/en.index`, `esim.index`, `lounge.index`, `sepet`, `destek`, `auth`, `_authenticated/account.*`) re-export the existing V2 page components (moved into `src/components/design-v2/pages/*` so both paths share one implementation — no copy). New `vignette.tsx`, `esim.bolge.$region.tsx`.
- Old page bodies moved into `src/routes/_authenticated/legacy-v1.*` (admin-gated, `robots noindex`); V1 components untouched.
- `design-v2.*` routes become `beforeLoad` 301 redirects; `V2Context` default flipped to `true` for public routes, `toV2Path` becomes identity/public map.
- Migration: `ALTER TYPE service_type ADD VALUE 'VIGNETTE'`; feature_flags rows inserted OFF; `services` row for VIGNETTE (enabled=false). Domain `SERVICE_TYPES`/`SERVICE_DEFINITIONS` extended.
- Rollback: restore the change-history version, or re-point the listed public route files to `legacy-v1` components.
