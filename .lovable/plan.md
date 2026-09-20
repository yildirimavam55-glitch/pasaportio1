# Final homepage conversion polish

## Goal
Preserve the approved Travely design and all existing logic while shortening the mobile eSIM journey to country search → package type → real package → cart.

## Changes
- Reduce only the mobile hero height and vertical spacing by roughly 10–15%, keeping the current image, copy readability, search placement, header, and service selector.
- Remove the large dashed eSIM Paket-Assistent card from the homepage sales path. Keep the existing assistant available as a small localized secondary link after the package grids on the eSIM package page.
- Keep country selection navigating directly to the existing catalogue-backed package page with no intermediate questionnaire or screen.
- Keep the destination heading first, followed immediately by the 50/50 Standard / Unlimited selector and real products; Standard remains the default for direct country-search visits.
- Move the compact compatibility check below the product grids so it never delays price visibility.
- Leave Lounge behavior and all provider, catalogue, recommendation, pricing, selection, cart, checkout, authentication, admin, translations, and routing logic unchanged.

## Validation
- Verify the eSIM journey at 360, 390, and 430 px: country selection opens real prices directly, Standard is active, package selection reveals the cart bar, and no horizontal overflow occurs.
- Confirm the assistant link and compatibility check appear after products, and check the preview diagnostics remain clean.
