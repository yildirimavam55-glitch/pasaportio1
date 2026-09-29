# Travely Storefront Editor — Stage 1

## Scope
Connect only the existing Theme settings to the live V2 storefront and add a safe draft, preview, publish, and version-history workflow. Do not start Stages 2–4 and do not publish the app.

## Implementation
1. **Published theme delivery**
   - Extend the existing published-theme read to resolve the selected logo safely from the media library.
   - Keep the current Travely mark as fallback and reserve fixed logo dimensions to prevent layout movement.
   - Apply the approved heading/body fonts, button style, surface preset, colors, radius, and shadow through centralized storefront theme variables/classes.
   - Preserve the current visual design when values are missing or defaults are selected.

2. **Draft and publish safety**
   - Keep edits local until “Save Draft”.
   - Keep normal public pages bound only to `theme_settings.published`.
   - Keep “Publish” explicit and version every save/publish action.

3. **Theme preview**
   - Add desktop/mobile preview modes inside Admin Theme.
   - Render representative V2 header, typography, buttons, cards, colors, radius, shadow, and surface using the unsaved draft in an isolated preview wrapper.
   - Reuse the selected media item for the preview logo without creating a second storefront.

4. **Version history**
   - Reuse `cms_versions` through one existing CMS document as the Theme history anchor; no schema, RLS, role, or security changes.
   - Show the latest 30 entries with time, action, and actor.
   - Restore only after confirmation; restored data becomes a draft and never publishes automatically.

5. **Verification**
   - Verify Admin Theme at 1440px and 390px.
   - Verify public V2 at 360px, 390px, 430px, and 1440px.
   - Exercise draft isolation, preview-only visibility, explicit publish behavior, and safe restore without publishing the app deployment.
   - Run security regression, full tests, typecheck, and use the platform build result.

## Boundaries
No supplier catalogue, product, pricing, cart, checkout, order, payment, provisioning, refund, coupon, authentication, role, RLS, security, service-control, country, or regional-product changes.
