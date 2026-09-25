# V2 Package Card Visual Polish

## Goal
Polish only the V2 eSIM package-card presentation while preserving every approved package, price, identifier, filter, sort, deduplication, regional, catalogue, and cart behavior.

## Changes
- Use one shared compact card geometry for Standard and Unlimited packages: equal height, padding, radius, border, shadow, title, validity, price, and info-icon positions.
- Reduce card height by roughly 10–15% without shrinking touch targets or changing the two-column grid.
- Render Unlimited titles as one line with a secondary infinity symbol followed by the localized label.
- Replace bottom-pushed card spacing with a compact title → validity → price content stack.
- Keep the fixed WhatsApp action above the navigation and add enough V2 page-bottom clearance so no package or final content is obstructed.

## Validation
- Compare Standard and Unlimited card geometry and measured height before/after.
- Check TR, DE, and EN at 360, 390, and 430 px, including a long Unlimited label.
- Confirm no clipping or horizontal overflow; prices stay grouped with validity; rows remain equal-height.
- Scroll the final package/content row above WhatsApp, bottom navigation, and the safe area.
- Confirm package values, prices, IDs, catalogue, cart mapping, and approved Unlimited logic are unchanged.
- Leave V2 unpublished.
