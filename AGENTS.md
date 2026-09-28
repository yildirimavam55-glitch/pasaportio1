<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Public installation instructions live in a V2 guide route; real QR, activation credentials, and package policy stay in authenticated account views to avoid exposing provisioning data.

V2 destination, airport, and vignette pickers share `V2PickerSheet`; scope mobile scroll-lock width overrides to its open sheet and suppress trigger refocus on close so the storefront keeps its x-position and scroll location.
Measure the visual viewport for focused V2 picker inputs and confine the result list above the mobile keyboard; viewport units alone do not track iOS keyboard occlusion.

Resolve V2 picker result taps on pointer release with movement/cancellation guards while deferring blur-driven viewport updates; iOS can suppress click when keyboard resizing moves a row mid-gesture.

Keep a GIN index on eSIM coverage country arrays because public country-package reads filter with array containment and otherwise risk database timeouts.
- i18n: one locale registry (`src/i18n/locales.ts`); languages without their own resources set `content: "en"` and are translated through `localize()` + static JSON resources in `src/i18n/resources/` — keeps one component system without widening every copy object.
- V2 country product pages reuse the central country photo registry, session device checker, catalogue queries, and cart store; presentation must not duplicate those data systems.
- Automatic eSIM compatibility may claim a result only for one unique exact browser model match in the curated compatibility catalogue; ambiguous and iPhone-family signals stay manual, and only manual confirmations persist.
- Regional eSIM discovery reuses published regional summaries, coverage classification, and region product routes; country search matches actual eligible package coverage, never geographic assumptions.
- Coupons: `promotions` + `promotion_redemptions` tables; discounts are computed only by `evaluateCoupon` (src/domain/promotions.ts) via `validateCouponServer` with catalogue prices and server time — checkout must re-run it before creating order pricing, store `discountSnapshot()` on the order and insert a redemption row. Why: client state can never be the price authority.
- Promotion banners (v2): `banner_text` stores `_v:"2"`, a Turkish source tagline and per-locale taglines translated once in Admin (`translateBannerText`), with `_source`/`_overrides` meta; the headline is built from campaign discount/code via `PROMO_HEADLINE`. Why: storefront never translates at runtime and codes/values are never duplicated as text; legacy template campaigns keep working.
- Refunds: eligibility, purchase window, paid amount and usage come only from `src/domain/refunds/refund-policy.ts` via `src/lib/refunds.functions.ts` with server time; `refund_requests` snapshots are DB-immutable, REFUNDED needs a confirmed payment refund, `refund_request_events` is append-only. Why: the client can never be refund authority.
- Security baseline: `docs/security/SECURITY_BASELINE.md` is owner-controlled; security-sensitive changes (RLS, roles, auth, secrets, supplier/payment/provisioning/refund authority, rate limits) STOP and report "SECURITY-SENSITIVE CHANGE REQUIRED" unless the task explicitly approves them, log in `docs/security/SECURITY_CHANGELOG.md`, and never weaken `src/security/security-baseline.test.ts`. Why: owners keep final security control; fail closed.
- Product tables use column-level SELECT grants for anon/authenticated; new columns stay hidden until deliberately granted, and Admin reads cost through `adminDb`/`privilegedAdminDb` after the server-side role check. Why: supplier cost must never reach the browser.
