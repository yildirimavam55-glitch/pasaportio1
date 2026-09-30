# FAQ final UI implementation

## Goal
Match the approved FAQ reference on desktop and mobile while preserving the current FAQ behavior, global language system, existing routes, and all non-FAQ storefront areas.

## Changes
- Rework the FAQ introduction into a compact two-column desktop layout and stacked mobile layout with eyebrow, localized heading/description, three help points, and a travel/eSIM image.
- Keep four initially closed FAQ category cards with restrained warm-white styling, mint icon accents, localized titles/subtitles, and inline question accordions.
- Reorganize the existing useful questions into General, Installation, Usage Abroad, and Payment/Order/Other without unsupported supplier claims or duplicated functionality.
- Add the localized lightweight support card below the categories, linking to the existing support destination.
- Extend FAQ copy through the existing static localization/fallback architecture for all supported storefront locales, including RTL-safe Arabic presentation.

## Validation
- Inspect 360, 390, 430, 1280, 1440, and 1920 widths in the real browser.
- Verify all categories start closed, category/question accordions work, support and installation links use existing destinations, language switching updates FAQ, Arabic RTL is correct, and no horizontal or bottom-overlay collisions occur.
- Confirm the preview build remains healthy and no non-FAQ behavior is changed.
