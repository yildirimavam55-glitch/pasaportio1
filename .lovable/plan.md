# Mobile Finder selected-button visual polish

## Scope
- Preserve the approved layout, colors, Finder behavior, calculations, recommendations, routes, backend, and service-switch logic.
- Change only the mobile typography and visual states of selectable controls in the Finder and eSIM/Lounge switch.

## Visual changes
- Raise selectable labels to at least 14px with semibold weight and stable single-line truncation at narrow widths.
- Standardize selected controls to the existing soft-mint surface, petrol border/text/icon, and a clear 16–18px right-aligned check where applicable.
- Keep unselected controls neutral and readable; preserve pastel icon variation only while unselected.
- Remove the selected card’s extra ring and rely on one border plus the soft background.
- Keep every selectable target at least 44px high and retain the compact mobile layout.
- Keep the eSIM/Lounge moving pill, with active text and icon changing in sync and maintaining accessible contrast.

## Verification
- Check Tek destinasyon / Çoklu rota, Az / Normal / Yoğun, usage chips, and eSIM / Lounge states at 360, 375, 390, 412, and 430px.
- Verify readable text, no clipping or horizontal overflow, no awkward wrapping, aligned icons/checks, clear selected hierarchy, and correct active contrast.
- Confirm the latest preview build and runtime logs remain clean.
