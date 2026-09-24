# Mobile header overlay and sticky search fix

## Scope
- Change only the shared public header overlay state and sticky-search visibility.
- Preserve homepage design, search behavior, account/auth flows, catalogue, commerce, Guides, and theme behavior.

## Implementation
- Make the existing language and signed-in profile dropdowns controlled by `PublicShell`, alongside the existing hamburger state.
- Derive one shared `isHeaderOverlayOpen` value from profile, language, and hamburger states.
- Pass that shared state into the existing `StickyQuickSearch` suppression mechanism so the search unmounts immediately, cannot receive clicks, and returns according to its existing scroll state after overlays close.
- Keep current dropdown/drawer focus management, navigation, and body-scroll behavior unchanged.

## Verification
- At 360, 390, and 430 px: scroll to reveal sticky search; repeatedly open and close profile, hamburger, and language overlays; verify search hides and restores, links remain clickable, and layers do not overlap.
- Verify account/profile navigation has no floating destination search.
- Verify TR/DE/EN and Light/Dark remain unchanged.
- Verify desktop header behavior, existing tests, and the latest preview build.
