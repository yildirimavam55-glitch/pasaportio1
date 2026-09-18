# eSIM / Lounge service transition polish

## Scope
- Remove the full-screen service-switch overlay and keep the existing header, footer, mobile navigation, routes, Finder logic, and page structure unchanged.
- Replace customer-facing eSIM service symbols with one shared Lucide SIM-connectivity icon while preserving the separate brand mark.

## Interaction
- Make the service selector use one sliding active pill with a 180–240ms ease-out transition and no checkmark.
- Crossfade only the outgoing/incoming Hero layers, including their images, with a subtle downward/upward movement under 12px.
- Crossfade only the outgoing/incoming Finder surfaces with a shorter subtle vertical transition.
- Keep switching guarded against repeated taps while the local transition completes; do not show a centered loader.
- Disable movement and shorten fades under reduced-motion preferences.

## Verification
- Confirm the shell remains visible and no white overlay or centered icon appears in either direction.
- Verify selector, Hero, Finder, shared icon treatment, and reduced-motion behavior at 360px, 390px, and 430px widths.
