# Mobile bottom navigation single-active fix

## Goal
Make the mobile bottom navigation derive one selected item from the current URL, so Home, eSIM, Lounge, and Account can never be highlighted together.

## Changes
- Derive a single `activeMobileNav` value from pathname plus the explicit `#finder` target.
- Treat plain `/` as Home even when its default service is eSIM.
- Use `/?service=esim#finder` and `/?service=lounge#finder` for explicit finder navigation, preserving browser back/forward behavior.
- Clear the finder hash when Home is tapped and return to the top.
- Remove the competing router-active styling path from bottom navigation; every item will use the same explicit active class rule.
- Preserve all existing service-switch, finder, catalogue, and purchase behavior.

## Verification
- Test Home → eSIM → Home → Lounge → Home → Account → browser Back.
- Confirm exactly one active item after every step at 360, 390, and 430px.
