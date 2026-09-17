# Service switch transition

## Scope
- Add one shared full-screen transition overlay around the existing eSIM/Lounge experience.
- Keep routing, Finder state, navigation, language behavior, and all page visuals unchanged.

## Behavior
- Route all in-page service switch controls through a guarded switch handler.
- On eSIM → Lounge, show a white overlay with the existing green airplane icon and subtle forward motion.
- On Lounge → eSIM, show the same overlay with a green connectivity/SIM icon and a restrained signal activation.
- Ignore repeated service-switch taps while the approximately 600ms sequence runs.
- Change the service while the overlay is opaque, then fade it away so old and new content never overlap.
- Preserve current scroll-to-Finder behavior for controls that already use it.

## Accessibility and validation
- Mark the overlay as a status surface and keep it out of normal layout flow.
- Under reduced-motion, shorten the transition and remove directional/icon movement.
- Verify both directions, repeated taps, no full reload, no flicker, and 360/390/430px rendering.
