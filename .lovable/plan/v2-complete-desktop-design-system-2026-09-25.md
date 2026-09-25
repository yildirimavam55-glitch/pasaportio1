# V2 Complete Desktop Design System

## Goal
Make the primary V2 storefront feel like a premium desktop travel-commerce site while preserving the approved mobile experience and all existing CMS-controlled content, search, catalogue, cart, authentication, and account behavior.

## Scope
- Customer-facing only: eSIM, Lounge, Vignette, country and regional package pages, cart, checkout, auth, account, guides/articles, and support.
- One responsive component system across mobile, tablet, desktop, and large desktop.
- No Admin redesign and no commerce, pricing, catalogue, supplier, payment, provisioning, QR, ownership, or security changes.

## Implementation
1. **Shared desktop foundation**
   - Expand the shared V2 shell to a balanced ~1280px desktop container while retaining current mobile widths and safe areas.
   - Replace the redundant desktop service pill with one clear shared header: logo, eSIM/Lounge/Vignette, cart, account, language.
   - Keep the approved mobile bottom navigation unchanged and hide it on desktop.
   - Add shared responsive typography, spacing, section, card, hero, rail/grid, footer, and action-dock rules through semantic tokens/utilities.
   - Keep CMS content and section ordering as the single source for both mobile and desktop.

2. **Discovery pages**
   - Make eSIM, Lounge, and Vignette heroes wide and controlled on desktop, using their current CMS images and copy.
   - Preserve each existing picker and sticky-search behavior; position the compact sticky search below the desktop header.
   - Adapt benefits to four desktop columns, destination and airport rails to wide grids/rails, regional cards to responsive six/three/two-column layouts, and global Unlimited to a restrained horizontal banner.
   - Use shared desktop compositions for compatibility/Lounge discovery, installation, Vignette discovery, guides, FAQ, and footer without inventing content or inventory.

3. **Package selection pages**
   - Expand country and regional pages to ~1180–1240px.
   - Show package cards in responsive 3–4 column grids while preserving Standard/Unlimited grouping, IDs, prices, deduplication, selected/deselected state, and cart mapping.
   - Arrange decision help and compatibility side by side, followed by the existing installation teaser.
   - Convert the selected-product control into a compact desktop purchase panel while retaining the approved mobile purchase bar.

4. **Commerce, auth, and account pages**
   - Cart: desktop item list plus sticky order summary.
   - Checkout: desktop customer/payment state plus order summary; payment remains disabled.
   - Login/register/reset: centered 420–520px form presentation using existing auth logic.
   - Account: desktop sidebar plus content; preserve mobile navigation and all ownership/security behavior.

5. **Guides and support**
   - Guide listing: three cards per desktop row using only published content.
   - Guide articles: readable 720–820px body with wider related-content areas.
   - Support: balanced desktop contact, quick-link, and FAQ composition with existing real destinations and localized text.
   - Ensure the shared footer uses available CMS links only and becomes multi-column where content permits.

## Technical details
- Primary files: `src/components/design-v2/V2Shell.tsx`, `V2Sections.tsx`, `V2DiscoveryContent.tsx`, `V2ProductSelection.tsx`, shared auth/account/guides/support components, relevant public route presentation files, and `src/styles.css`.
- Reuse existing `PublicShell`, V2 CMS config, service accent tokens, picker/search components, cart store, and route logic.
- No separate desktop component tree, duplicate search, duplicate cart, or hard-coded desktop copy/images.
- Keep mobile styles as the base; add tablet/desktop behavior at `md`/`lg`/`2xl` breakpoints.

## Verification
- Runtime viewport matrix: 360×800, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080.
- Runtime pages: eSIM, Lounge, Vignette, country package, regional package, cart, checkout, login/register, account, orders, My eSIMs, guide list/article, support.
- Runtime interactions: all three searches, sticky search, language, Standard/Unlimited, selection/deselection, quantity, cart, navigation, and safe signed-out auth flow.
- Check overflow, clipping, image crop, whitespace, duplicate navigation, layout shift, sticky controls, WhatsApp, and approved mobile regression.
- Run typecheck, all automated tests, and build validation.
- Capture real implementation screenshots at 390px eSIM and 1440px eSIM, Lounge, Vignette, country/package, and cart.
- Do not publish; stop for visual approval with the requested PASS/FAIL report.
