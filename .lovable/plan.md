# V2 iOS one-tap country selection

## Scope
Fix only the shared picker interaction so a result tap commits before iOS keyboard blur and viewport changes, without changing visuals, ranking, data, or commerce behavior.

## Implementation
- Trace the current touch/pointer, blur, viewport-resize, sheet-close, and selection sequence.
- Add one shared tap-intent handler that commits exactly once before blur can move/remove the result.
- Distinguish taps from drag gestures so result-list scrolling never selects accidentally.
- Keep the existing click path for keyboard and assistive activation without duplicate selection or navigation.
- Apply the central behavior automatically to eSIM, Lounge, and Vignette picker users.

## Verification
- Add an automated regression covering focused input, result interaction start, blur/viewport change, and exactly-one selection/action.
- Verify Türkiye, Germany, and Italy queries, multiple-result targeting, hero and sticky entry points.
- Check 360/390/430px keyboard geometry, 56px rows, safe-area header, horizontal stability, scroll restoration, tap-versus-drag behavior, and shared service pickers.
- Run typecheck, full tests, and confirm the preview build log is successful.

## Constraints
No redesign, sheet sizing change, ranking/data change, commerce change, publishing, or real supplier action.
