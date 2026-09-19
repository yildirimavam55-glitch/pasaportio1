# Shared Hero and stable Finder service switch

## Scope
- Keep all backend, catalogue, recommendation, pricing, cart, authentication, admin, routing, translations, and service controls unchanged.
- Replace the service-specific customer Hero with one shared travel Hero while preserving the current visual system and CMS-managed image support.

## Shared Hero
- Render one stable Hero above the service selector, independent of the selected service and transition phase.
- Use shared TR/DE/EN copy describing both eSIM and Lounge, including the requested Turkish headline and CTA.
- Use service-neutral trust benefits and keep the CTA scrolling to the service selector/Finder.
- Source the shared image and visual settings from one consistent CMS Hero configuration so switching services cannot swap or crossfade the image.

## Finder switching and scroll
- Keep the selector mounted and animate its pill for 600ms with the approved easing.
- Animate only the service-specific Finder: 400ms fade-out with 6px downward movement, then 700ms fade-in from 12px below.
- Capture the selector’s viewport top before the switch, then compensate after the new Finder commits so the selector remains at the same screen position.
- Preserve existing independent eSIM and Lounge state, repeated-tap protection, and router `resetScroll: false` behavior.
- Bottom navigation switches first; it scrolls to the selector/Finder only when that area is outside the nearby viewport.

## Verification
- Test 360, 375, 390, 412, and 430px widths for both switch directions, state retention, rapid taps, stable selector position, and no Hero change.
- Test bottom-navigation switching from below the Finder, horizontal overflow, layout jumps, console errors, and reduced-motion behavior.
- Confirm the preview build is healthy after the changes.
