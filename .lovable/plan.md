# Mobile motion and service-switch polish

## Scope
- Keep the approved design, Finder logic, supplier data, recommendations, pricing, cart, admin, integrations, routes, and translations unchanged.
- Change only customer-page motion, service-switch scroll behavior, and scroll-position preservation.

## Service switching
- Preserve the Finder/selector’s viewport anchor before the service search state changes, then restore that anchor immediately after the new service content commits.
- Prevent TanStack navigation from resetting scroll during eSIM/Lounge search-state changes.
- Keep the selector mounted and animate only its active pill and text/icon colors.
- Fade the outgoing Finder for 180–220ms with a 6px downward movement, then fade the incoming Finder for 300–380ms from 10–12px below using `cubic-bezier(.22, 1, .36, 1)`.
- Continue updating the off-screen Hero for the selected service without moving the viewport.
- Preserve both Finder states across service changes and keep the existing repeated-tap guard.

## Bottom navigation
- When eSIM’imi Bul or Lounge Bul is pressed, switch first.
- If the Finder is already visible or near the viewport, preserve its position without another scroll.
- If it is far away, smooth-scroll to the Finder after the switch; never scroll to the Hero.

## Reveal motion
- Keep the existing IntersectionObserver-based, reveal-once architecture for below-the-fold sections.
- Use a 24px `translate3d` plus `scale(.99)` entrance over 600–700ms with the requested easing and a roughly 10% lower viewport trigger margin.
- Add short 70ms card staggers to eligible destination, trust, solution, and “how it works” grids without changing their layout.
- Give estimated usage and recommendation results a separate immediate 300ms, 8px reveal rather than the slower page-section motion.
- Animate only opacity and transform; avoid scroll listeners and layout-affecting animation properties.

## Accessibility and verification
- Under reduced motion, show content immediately and disable transforms while preserving all behavior.
- Test at 360, 375, 390, 412, and 430px: both switch directions, Finder-state retention, bottom-nav behavior near/far from Finder, reveal-once behavior, no Hero jump, no horizontal overflow, no visible layout jump, and reduced motion.
