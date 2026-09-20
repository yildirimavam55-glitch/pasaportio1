# Travely service-specific mobile hero

## Goal
Create one shared hero system for both eSIM and Lounge while giving each service its own original image, headline, supporting copy, and primary search. Preserve the existing fast country-to-package and airport-to-Lounge flows.

## What will change
- Reorder the first screen to: header → service-specific hero → search → eSIM/Lounge switch → existing result/content area.
- Generate two original, mobile-friendly Travely visuals:
  - eSIM: traveler using a phone in a bright travel setting.
  - Lounge: premium airport lounge with a relaxed traveler and carry-on.
- Add concise TR/DE/EN service-specific hero copy within the current Travely typography and warm cream/petrol/mint/lavender/orange system.
- Place the existing real country/airport autocomplete inside the hero as the main action; keep its navigation and data behavior unchanged.
- Keep the optional eSIM package assistant secondary and never restore it to the primary journey.
- Preserve service-switch position behavior, existing routes, catalogue, pricing, cart, authentication, admin, and all backend logic.

## Interaction and accessibility
- Switching eSIM/Lounge updates only the hero content, image, search mode, and existing service content using calm opacity/transform transitions.
- Search remains keyboard accessible, supports Enter, and keeps readable results at 360–430px.
- Reduced-motion users see changes immediately.
- Images use stable dimensions, responsive crops, meaningful alt text, and lightweight local assets.

## Verification
- Test eSIM country search → direct package page and Lounge airport search → existing Lounge flow.
- Check TR/DE/EN at 360, 375, 390, 412, and 430px for cropping, text fit, autocomplete layering, scroll preservation, and console errors.
- Confirm the old large eSIM finder remains optional only and no business logic changed.
