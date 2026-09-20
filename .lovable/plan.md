# Mobile search focus mode

## Goal
Keep the current eSIM/Lounge hero and search logic, while giving autocomplete a clean mobile focus state.

## Changes
- Let the shared quick-search report when focus/autocomplete mode starts and ends.
- While search mode is active, visually collapse the hero headline/image area and hide the service selector plus overlapping content; keep the header, input, and results visible.
- Preserve the active eSIM/Lounge state and restore the selector after selection, submission, close, or blur.
- Raise the search and autocomplete stacking order, cap results to the available dynamic viewport, and add the requested fast opacity/translate transitions.
- Preserve reduced-motion behavior and all existing country, airport, navigation, and service-switch logic.

## Verification
- Test eSIM country selection and Lounge airport selection at 360, 390, and 430px.
- Confirm the selector is hidden only during search, returns afterward, active service is unchanged, and no overflow or console errors occur.
