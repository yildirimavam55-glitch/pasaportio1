# Approved Travely visual-system preservation

## Scope
- Keep the current Travely storefront design exactly as the visual baseline: cream surfaces, petrol typography, mint icon accents, premium travel photography, rounded cards, restrained shadows, current header/search/navigation/WhatsApp treatments.
- Limit work to the public eSIM journey: homepage search → country picker → country packages → Standard/Unlimited → package details/selection → cart.
- Do not change unrelated homepage sections, Roaming Comparison, Trust, Reviews, translations architecture, catalogue data, pricing, curation rules, supplier integration, checkout logic, payments, security, migrations, or dependencies.

## Implementation
1. **Reference-locked audit**
   - Compare the rendered flow at 360, 390, 430, 1280, and 1440 pixels against the existing approved V2 components and tokens.
   - Treat the current header, search, country photography, segmented control, package cards, bottom navigation, FAQ, and WhatsApp treatment as authoritative rather than creating alternatives.

2. **Minimal presentation corrections only**
   - Correct only discrepancies proven by rendered screenshots: spacing, clipping, border/radius consistency, icon treatment, fixed-control overlap, or desktop alignment.
   - Reuse `V2Shell`, `V2PickerSheet`, `V2ProductSelectionCard`, `V2EsimPackageDetails`, the current cart surfaces, FAQ system, and semantic theme tokens.
   - Preserve the current real product fields, published customer prices, whole-card selection, concise curated package set, cart state, and existing mobile/desktop content order.

3. **Language and direction checks**
   - Verify TR, DE, EN, and AR without rebuilding translations.
   - Confirm package inventory does not change with language and Arabic renders RTL with the correct Unlimited label.

4. **End-to-end browser verification**
   - Test original and sticky country search, picker typing/selection, country page, Standard and Unlimited tabs, real prices, details, package selection, add-to-cart, and cart presentation.
   - Check that WhatsApp, purchase summary, bottom navigation, package CTAs, and FAQ content never overlap.
   - Stop before checkout payment and make no supplier purchase or provisioning call.

## Acceptance
- The existing approved Travely identity remains visually unchanged and coherent across the complete eSIM sales journey.
- Mobile checks pass at 360/390/430; desktop checks pass at 1280/1440.
- Functional checks pass for country search/results/selection, both package types, real prices, curation, details, cart, TR/DE/EN/AR, and RTL.
- Database schema, catalogue rules/data, pricing, security, dependencies, payments, supplier purchases, and published application remain unchanged.
