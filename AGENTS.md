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

Read subdirectory AGENTS.md files before changing files there.
Installation uses one V2 guide; credentials require existing owner-authenticated reads or token-authorized delivery — why: one guide must not expose secrets.
- V2 pickers share `V2PickerSheet`; preserve mobile scroll/x-position and visual-viewport keyboard handling, with guarded pointer-up selection.
- Keep the eSIM coverage-array GIN index; public catalogue containment queries depend on it.
- i18n shares one locale registry; overlays use English source and static `localize()` resources.
- V2 country pages reuse central photos, device checker, catalogue queries, and cart state; never duplicate these systems.
- Compatibility claims require one exact curated model match; ambiguous/iPhone-family signals stay manual, and only manual confirmations persist.
- Regional discovery uses published summaries, coverage classification, and product routes; eligibility comes from package coverage only.
- Coupons use server validation and shared code state for cart/checkout totals; panels share shell-local exclusive state and CartContents, never persist opening — why: preserve items without stacked panels or divergent totals.
- V2 promotion copy stores one Turkish source plus locale translations; storefront never runtime-translates campaigns or duplicates codes/values.
- Refund authority stays server-side; snapshots are immutable, events append-only, and REFUNDED requires confirmed payment refund.
- The security baseline is owner-controlled; unapproved sensitive changes must stop, be logged, and never weaken baseline tests.
- Product commercial columns stay hidden via column grants; Admin cost reads happen only after server role checks.
- The eSIM homepage has one compact compatibility card aligned with the worldwide banner, opening the shared DeviceCheckSheet; floating support moves only on measured card overlap — why: no duplicate checker or narrowed card.
- Legal content uses two CMS rows: an Admin-only DRAFT row and a PUBLISHED row holding only explicitly published documents, so RLS never exposes drafts; text uses the safe LegalRichText markup, never HTML.
- Central installation education shares credential-free phone/QR/navigation components; real values use existing owner checks, and guest tokens stay in delivery — why: no duplicate guides or public secrets.
- Loader-fetched queries are dehydrated with the router and signed media URLs stay stable across refetches, so hydration reuses the server-rendered image sources instead of swapping or re-downloading them.
- Theme editor reuses global config; homepage light roles exclude Hero/header. Dark ink targets wrapper/story consumers, not Hero/prices — why: local tokens beat root themes.
- Sync/import never write price/flags/publication of existing products; new ones arrive DRAFT with a suggestion. Repricing baselines come from approved snapshots; prices change only by Admin approval — why: legacy markup must never overwrite approved prices.
- Country "from" prices and regional-card inputs come from `storefront_country_starting_prices` / `storefront_regional_package_rows`; mirror visibility/Essential-only changes there and in `listEsimPackages` — why: page loads must never scan the full catalogue.
- Homepage loader primes only layout and the shared country-price query; other sections load client-side with fixed placeholders, and `Reveal` is visible by default — why: complete first viewport without a heavier server response.
- eSIM home shares CMS/search/gift/trust and the loading-gated device status — why: missing data never implies incompatibility.
- Browser-only locales await resolution in a neutral shell; TR/DE/EN URLs remain SSR — why: unknown browser preferences must not flash another language.
- Worldwide static photos reuse REGION_DISCOVERY media/crops/preview; price/coverage share one catalogue row — why: no duplicate tools or false claims.
- One shared PaymentStrip uses story CSS ordering for desktop copy/mobile below-photo placement — why: never duplicate availability data.
- Refund verdicts use stored activation history plus confirmed never-activated provider evidence, not current status — why: past activation and duplicate requests stay blocked.
- Root CurrencyProvider + displayMoney are the only currency path; EUR stays canonical, rateless currencies are hidden, only payment-verified ones charge — why: no fake prices.
- Review samples are gated by editor-frame intent plus the server Admin query, never hostnames; CMS refresh failures keep last-known published data instead of an empty fallback.
- Fresh databases build from db/baseline/0000_baseline_schema.sql, then drizzle/migrations in order; security grants live in migrations — why: copies must reproduce the hardened live schema.
- Guest orders have customer_id null + normalized guest_email; idempotency is scoped per owner and guest delivery links use hashed, expiring tokens only — why: guests never get accounts and links must never leak access.
- Site origin = SITE_URL; sitemaps share one builder — why: no conflicting domains.
