# V2 eSIM homepage final simplification

## Scope
- Preserve the approved V2 hero, colors, typography, popular-destination cards, country package results, and bottom navigation.
- Change only the `/design-v2/esim` homepage structure and shared V2 presentation needed for sticky search and compact sections.
- Do not change catalogue rows, prices, Standard/Unlimited/regional selection logic, product IDs, cart identity, database, Admin, payment, provisioning, production routes, or publish state.

## Homepage flow
1. Keep the existing header and hero country search.
2. Keep the compact, real-price popular destinations rail.
3. Add up to three genuine published global/worldwide Unlimited products selected from real coverage metadata; omit the section if none qualify.
4. Reuse the existing device compatibility checker in a compact utility section.
5. Keep one Lounge discovery banner.
6. Keep the iPhone/Android installation section, shortened to four truthful steps with no sample QR.
7. Keep one Vignette discovery banner.
8. Reuse the published-guides rail.
9. Reduce the homepage FAQ to five high-value questions.
10. Finish with the existing footer and bottom navigation.

## Sticky country search
- Observe the existing hero search field and show a compact bar below the header only after that field leaves view.
- Open the same existing `V2PickerSheet`, query state, real country list, prices, and selection handler; do not create a parallel search flow.
- Suppress it while the original field is visible and while header overlays are open through the existing shell behavior.
- Keep it outside document flow to avoid layout shifts, with enough scroll clearance for headings and cards.

## Homepage simplification
- Remove the homepage trust row, large data-usage education block, standalone “Why travely?”, duplicate “How it works,” and package-assistant presentation.
- Keep package assistance and all package-result behavior unchanged inside the selected-country flow.

## Verification
- Verify the selected global products against real catalogue fields and report IDs, duration, coverage count, price, and supported network generation.
- Test hero and sticky searches, popular destinations, global product selection, compatibility, Lounge/Vignette navigation, installation tabs, guides, and FAQ.
- Check TR/DE/EN at 360/390/430 px for visibility switching, horizontal overflow, content coverage, WhatsApp, bottom navigation, footer reachability, and German text width.
- Confirm build health, no production changes, and no publication.
