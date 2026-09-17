# eSIM Result Area Visual Correction

## Scope
- Change only the eSIM Finder result area and its state handoff to the existing package page.
- Preserve the current header, mobile navigation, Lounge experience, country/route pickers, device checker, architecture, and design tokens.

## Implementation
1. Add the compact Low / Normal / High intensity selector above the existing two-column usage grid, using the current admin-configured intensity multipliers.
2. Replace the combined dark result panel with:
   - a compact petrol estimated-usage bar showing one calculated need value;
   - a separate mint recommendation card directly below it.
3. When a real catalogue product matches, show its package size, validity/trip metadata, catalogue price, localized “Why this package?” explanation, orange Add to cart button, and package-list action.
4. When no product exists, keep the recommendation card structure but show a localized “Package options are being prepared” state without price or purchase action.
5. Preserve destination, route, days, travelers, usage selections, intensity, estimated usage, and recommended size in the `/esim/paketler` navigation state.
6. Correct singular/plural traveler copy in Turkish, German, and English.
7. Keep the recommendation reveal subtle (fade + small vertical movement, approximately 400–500ms) and avoid fixed-control overlap.
8. Remove only public developer/phase placeholder copy found during verification.

## Verification and release
- Compare the rendered result hierarchy against the supplied target at 360, 390, and 430 px.
- Verify the package page opens with preserved Finder state and the current bottom navigation is unchanged.
- Run focused tests and type validation.
- Compare the current published site, publish the corrected build, then verify the published URL itself.
- Do not start provider, payment, or any later phase work.
