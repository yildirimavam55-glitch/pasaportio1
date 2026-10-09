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

Public install help stays in V2; QR, activation credentials, and package policy stay in authenticated account views.
- V2 pickers share `V2PickerSheet`; preserve mobile scroll/x-position and visual-viewport keyboard handling, with guarded pointer-up selection.
- Keep the eSIM coverage-array GIN index; public catalogue containment queries depend on it.
- i18n uses one locale registry; overlay locales use English source plus static resources through `localize()`.
- V2 country pages reuse central photos, device checker, catalogue queries, and cart state; never duplicate these systems.
- Compatibility claims require one exact curated model match; ambiguous/iPhone-family signals stay manual, and only manual confirmations persist.
- Regional discovery uses published summaries, coverage classification, and product routes; eligibility comes from package coverage only.
- Coupons use server validation and shared code state for cart/checkout totals; panels share shell-local exclusive state and CartContents, never persist opening — why: preserve items without stacked panels or divergent totals.
- V2 promotion copy stores one Turkish source plus locale translations; storefront never runtime-translates campaigns or duplicates codes/values.
- Refund authority stays server-side; snapshots are immutable, events append-only, and REFUNDED requires confirmed payment refund.
- The security baseline is owner-controlled; unapproved sensitive changes must stop, be logged, and never weaken baseline tests.
- Product commercial columns stay hidden via column grants; Admin cost reads happen only after server role checks.
- The eSIM homepage keeps compatibility only in its hero band; the standalone compatibility section ships removed from both layouts.
- Legal content uses two CMS rows: an Admin-only DRAFT row and a PUBLISHED row holding only explicitly published documents, so RLS never exposes drafts; text uses the safe LegalRichText markup, never HTML.
- Public eSIM installation education shares presentation-only method, phone, QR, success, and travel-use components; protected real install data remains account-only so public demos can never expose credentials.

- Loader-fetched queries are dehydrated with the router and signed media URLs stay stable across refetches, so hydration reuses the server-rendered image sources instead of swapping or re-downloading them.
- Storefront theme editing extends the existing V2 section registry and global theme document; optional sanitized settings must fall back exactly to the approved Travely presentation.
- Sync/import never write price/flags/publication of existing products; new ones arrive DRAFT with a suggestion only. Repricing queue derives baselines from approved snapshots, read-only; prices change only by single Admin approval — why: legacy markup must never overwrite approved prices.
- Storefront country "from" prices and regional-card inputs are computed by the database functions `storefront_country_starting_prices` / `storefront_regional_package_rows` (security invoker); any change to visibility or Essential-only rules must be mirrored there and in `listEsimPackages` — why: initial page loads must never scan the full catalogue.
- The homepage loader primes only the layout and the shared country-price query; regional cards, guides, footer, theme and availability stay client-loaded with fixed-size placeholders, and `Reveal` renders visible by default, hiding only items below the viewport after hydration — why: the first viewport must be complete without making the server response heavier.
- eSIM home shares CMS/search/gift/trust and the loading-gated device status — why: missing data never implies incompatibility.
- Browser-only locales await resolution in a neutral shell; TR/DE/EN URLs remain SSR — why: unknown browser preferences must not flash another language.
- Reviews reuse CMS and verified aggregates to preserve evidence ownership.
- One shared PaymentStrip uses story CSS ordering for desktop copy/mobile below-photo placement — why: never duplicate availability data.

- Account demos require preview opt-in and account auth, with no writes/order counts — why: simulations cannot become purchases.
- Standard refund requests use stored activation history and confirmed never-activated provider evidence in the shared server verdict, not current status alone — why: past activation and duplicate completed requests must remain blocked.

- Install phones use normal flow, not clipping; antenna crop/arcs share source coordinates and cover offsets for stable resizing.
- Root CurrencyProvider + displayMoney are the only currency path; EUR stays canonical, rateless currencies are hidden, only payment-verified ones charge — why: no fake prices.
