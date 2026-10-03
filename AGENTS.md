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
- Coupons are server-priced only through `evaluateCoupon`/`validateCouponServer`; checkout revalidates and snapshots discounts/redemptions.
- V2 promotion copy stores one Turkish source plus locale translations; storefront never runtime-translates campaigns or duplicates codes/values.
- Refund authority stays server-side; snapshots are immutable, events append-only, and REFUNDED requires confirmed payment refund.
- The security baseline is owner-controlled; unapproved sensitive changes must stop, be logged, and never weaken baseline tests.
- Product commercial columns stay hidden via column grants; Admin cost reads happen only after server role checks.
- The eSIM homepage groups compatibility with Lounge/Vignette only at `lg`; sub-1024 keeps the configured mobile sequence and media.
- Legal content uses two CMS rows: an Admin-only DRAFT row and a PUBLISHED row holding only explicitly published documents, so RLS never exposes drafts; text uses the safe LegalRichText markup, never HTML.
- Public eSIM installation education shares presentation-only method, phone, QR, success, and travel-use components; protected real install data remains account-only so public demos can never expose credentials.
- Homepage trust and review content lives in the existing V2 CMS document; public reads require both verified and published review flags so unapproved customer content stays private.
- Fictional editorial review fixtures and inactive payment visuals render only in the V2 CMS preview iframe; public V2 reads strip editorial/demo reviews and never imply unavailable payment methods are active.
- The V2 Social Proof main media is a CMS-selected lifestyle photo in a fixed responsive frame, never a phone mask; keep its chips as independent editable items so image replacement needs no code change.
- Trust benefit visuals resolve each item's existing CMS media ID or selected icon through the shared V2 media registry; preserve per-item Admin editing rather than embedding card-specific assets in the rendering component.
- Trust benefit custom images use an optional per-item CMS scale and contained rendering; this compensates for differing artwork proportions without altering shared card dimensions or uploaded media.
