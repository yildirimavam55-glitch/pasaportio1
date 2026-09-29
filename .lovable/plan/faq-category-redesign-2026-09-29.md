# FAQ category redesign

## Scope
- Change only the eSIM storefront FAQ presentation and localized FAQ copy.
- Preserve all catalogue, pricing, cart, checkout, account, security, header, language selector, WhatsApp, and bottom-navigation behavior.
- Do not publish.

## Implementation
- Replace the current flat eSIM FAQ with four stable-ID categories: General eSIM, Installation, Usage Abroad, and Apps & Communication.
- Add a compact localized page heading and category cards with restrained mint, amber, blue, and rose semantic accents.
- Make categories collapsible and retain inline question accordions, 44px touch targets, natural wrapping, aligned chevrons, reduced-motion support, RTL layout, and bottom clearance.
- Remove the device-compatibility and hotspot questions; add only a subtle link to the existing installation guide where relevant.
- Reuse verified existing answers and translations, simplify claims to catalogue-safe wording, and add missing static translations for all 14 storefront languages through the existing resource system.
- Render the categorized FAQ in the published eSIM homepage FAQ slot without changing other configurable sections or product-page behavior.

## Verification
- Test DE, TR, EN, and AR language switching and Arabic RTL.
- Verify static translations/fallbacks for FR, ES, IT, PT, NL, PL, RU, JA, KO, and ZH.
- Test category and question accordions at 360, 390, 430, and 1440 px.
- Check horizontal overflow, long text, WhatsApp and bottom-navigation clearance, build health, and public storefront behavior.
