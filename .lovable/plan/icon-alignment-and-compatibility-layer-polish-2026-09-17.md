# Icon alignment and compatibility layer polish

## Scope
- Keep all existing customer flows, copy, calculations, routes, and layouts intact.
- Normalize customer-facing icon boxes, SVG sizing, stroke weight, and icon/text centering through shared visual utilities.
- Align the three Lounge status icons and all four mobile navigation items without changing their behavior.

## Compatibility checker
- Restyle only this sheet’s overlay to a translucent petrol backdrop with subtle blur.
- Keep it as a rounded mobile bottom sheet with a handle, clear 44px close target, bounded height, and internal scrolling.
- Present the same content as a centered modal on larger screens.
- Rely on the existing accessible dialog behavior for scroll locking, focus control, escape/backdrop close, and cleanup.
- Use short fade and slide transitions with reduced-motion fallbacks.

## Verification
- Inspect service, usage, trust, compatibility, flight, navigation, process, delivery, destination, and account icons.
- Repeatedly open and close the checker after scrolling; verify scroll position, brightness, pointer access, and no residual overlay or blur.
- Visually verify eSIM and Lounge screens at 360, 390, and 430px.
