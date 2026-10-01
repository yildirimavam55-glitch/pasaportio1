# Professional Footer and Legal Center

## Scope
Build the public footer, six stable legal pages, and owner controls using the existing `cms_documents`, `cms_translations`, `cms_versions`, storefront draft/publish flow, media library, and Admin authorization. No database migration, dependency update, payment change, security change, or publishing.

## Implementation
1. **Extend the existing structured content model**
   - Add sanitized footer configuration for grouped links, brand copy, optional social links, newsletter presentation, and desired payment-logo toggles.
   - Preserve draft/published separation and version history. Public pages read published content only.
   - Payment logos require both an Admin preference and real payment capability; because payments are not configured, none will appear publicly.
   - Newsletter footer content remains presentation-only and clearly unavailable for subscription until the existing Communication Center exists.

2. **Build the responsive public footer**
   - Replace the minimal footer with compact brand, Services, Help, and Legal groups.
   - Use stacked accordions on mobile and four-column navigation on desktop.
   - Link legal items to stable `/legal/*` pages, preserve WhatsApp and fixed-navigation safe areas, and avoid new empty vertical space.
   - Use the central 14-locale registry and static translation overlay; Arabic renders RTL.

3. **Add stable legal pages**
   - Create `/legal/imprint`, `/legal/privacy`, `/legal/terms`, `/legal/withdrawal`, `/legal/refund`, and `/legal/cookies`.
   - Render only explicitly published Admin content; where identity or decisions are absent, show honest “missing information / review required” states instead of invented facts.
   - Provide structured built-in section outlines grounded in the current implementation, including separate eSIM/Lounge/Vignette withdrawal sections, transactional-vs-marketing communication, necessary storage categories, and the eligible-unused-eSIM 14-day refund principle.
   - Add unique metadata for every legal route.

4. **Add Admin → Legal / Yasal**
   - Add a compact status dashboard, company-information editor, document tabs, 14-language editing, Arabic RTL preview, last-updated field, draft save, explicit publish/unpublish, and desktop/mobile previews.
   - Store legal documents as dedicated records in the existing CMS tables; sanitize all content and URLs and accept no executable HTML or JavaScript.
   - Treat Turkish as master copy and support manual per-language editing. Automated “translate all” will only be exposed if an existing safe stored-translation service is available; otherwise that control will be marked unavailable rather than faked.

5. **Extend Admin footer controls**
   - Expand Menu & footer management for grouped/reorderable links, visibility, internal/external safe URLs, social links, newsletter block copy, payment preferences, and real desktop/mobile previews.
   - Preserve explicit draft and publish controls.

6. **Verify**
   - Run focused tests for sanitization, published-only reads, route/link coverage, 14 locales, RTL, missing-information handling, and payment/newsletter safeguards.
   - Verify public pages and Admin flows in the browser, including footer geometry at 360, 390, 430, and desktop widths; confirm no horizontal overflow, overlap, or large pre-footer gap.
   - Confirm the current build is healthy and no database, migration, payment, security, dependency, or publish changes occurred.

## Expected limitations
- No legal wording will be represented as approved or compliant; company identity and unresolved commercial rules remain visibly missing or review-required until the owner supplies them.
- “Translate all” cannot generate translations unless a pre-existing approved translation service supports it; manual editing and stored static translations remain available.
- Newsletter submission and payment logos remain inactive/hidden until their approved systems are configured.
