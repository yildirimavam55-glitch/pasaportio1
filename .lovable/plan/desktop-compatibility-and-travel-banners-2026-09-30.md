# Desktop compatibility and travel banners

## Scope
- Change only the eSIM homepage compatibility, Lounge, and Vignette presentation at widths of 1024px and above.
- Preserve the existing under-1024 layout, content order, interactions, sticky search, bottom navigation, WhatsApp placement, and all business behavior.
- Keep the Global Unlimited, installation, and every other homepage section unchanged.

## Implementation
1. Add a desktop-only full-width compatibility tool banner immediately below Global Unlimited.
   - Reuse the existing compatibility checker trigger and state.
   - Use a neutral phone/eSIM symbol unless the existing checker has produced a verified result.
   - Reuse the existing localization/fallback system for title, supporting text, and CTA.
2. Place Lounge and Vignette in an equal 50/50 desktop row beneath compatibility.
   - Give both banners identical height, radius, padding, overlay treatment, CTA style, and vertical alignment.
   - Keep the existing Lounge and Vignette routes.
3. Use the existing airport-lounge photography and create one new realistic European road-travel image for the desktop Vignette banner.
   - Configure intentional desktop focal positions so lounge seating/airport context and road/car remain visible.
   - Keep the current mobile imagery and crops unchanged.
4. Preserve CMS-driven section visibility/copy while grouping only the intended default homepage sequence on desktop.

## Verification
- Check the actual eSIM homepage at 1280×800, 1440×900, and 1920×1080 for width, height, crop, readability, equal banner geometry, neutral compatibility state, CTA behavior, alignment, and overflow.
- Regression-check 390px and 430px against the current presentation.
- Check current build diagnostics after implementation; do not publish.
