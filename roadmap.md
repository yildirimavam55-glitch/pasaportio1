# Roadmap

## Current request
- [ ] Replace only closed hero gift with localized compact coupon ticket; verify four widths, keyboard/popup close, active and simulated inactive campaign states without changing campaign data or publishing.
- [x] Correct mobile hero crop to 88% horizontal position without resizing; couple/antenna visually verified at 360/390/430, desktop unchanged at 1440. Four source-anchored arcs, off-crop hiding, reduced-motion and no overflow/runtime errors checked; no publication.
- [x] Replace hero photo and verify four SVG lines, three-second CSS cycle, crop-aware hiding and static reduced-motion; mobile/desktop checked, no publication.
- [x] Apply combined-rating review reference and six-second dots-only carousel; extend existing Admin source metadata safely.
- [x] Verify 390/768/1440 in four languages, partial stars, dots/autoplay/hover/focus/resume/simulated touch/loop/reduced-motion and preserved family/comparison; screenshots and limitations supplied. 41 focused tests passed; broader CMS suite has two unrelated default-fixture failures. Physical touch, hidden-tab/offscreen lifecycle, long-review dialog and actual Admin save remain untested. Not published.
- [x] Replace only testimonial widget with approved desktop/mobile carousel; preserve CMS and public gates.
- [x] Verify 16 width/locale combinations, three desktop cards, mobile next-card preview, controls, hover/manual/resume/reduced-motion, simulated swipe and preserved bars; 36 tests passed. Independent screenshots and limitations report supplied. Long-review dialog, physical touch and hidden-tab/off-screen lifecycle remain untested end-to-end.
- [x] Restore localized Google/Trustpilot preview samples and complete comparison prices with reveal-once cost bars; preserve public evidence gates and Direct attribution.
- [x] Validate 16 locale/width combinations, carousel arrows/dots/pause/resume, hover/focus/off-screen/reduced-motion guards, zero/intermediate/final bars and search; 34 tests passed. Local independent-preview screenshots and recording supplied; hosted private preview login, real touch swipe and hidden-tab lifecycle remain untested.
- [x] Replace family/reviews/comparison presentation, extend existing CMS source metadata and preserve production gates.
- [x] Validate 16 language/width combinations, card proportions, arrows/dots/resume, conversion and preview gates; 24 tests passed. Screenshots supplied; real touch swipe, Admin publication and hidden-tab/off-screen lifecycle remain untested.
- [x] Show readable device outcomes using actual catalogue status; compact trust labels and restore photo/panel country cards.
- [x] Verify TR/DE/EN/AR at 360/390/430/1440; actual iPhone 15 compatible, iPhone 7 incompatible and Pixel 4 uncertain outcomes, selection clearing and 33 tests passed; deliver screenshots without publishing. Physical-device detection not tested.
- [x] Apply final coastal photo/gift composition with retained header controls, compact search/checker and unchanged country cards.
- [x] Gate entire gift with existing campaign; test open-ticket removal using a simulated server response (no Admin data change), one linked trust band, fixed WhatsApp.
- [x] Verify 16 locale/width combinations, copy, close, model selection/reset, keyboard/arrow country routing, language and EUR selector, fixed WhatsApp and screenshots; 49 tests passed. Physical-device detection, real Admin disable, signed-in account/cart contents and non-EUR conversion remain untested.
- [x] Apply summit photo and real HTML heading/coupon/search, mobile and desktop, retaining CMS overrides.
- [x] Move strict compatibility checker below search; keep four accessible trust actions above unchanged countries using existing information/links.
- [x] Verify four widths/locales, coupon copy, device/model and country workflows; present 390×844 and desktop screenshots. Physical-device detection and an actual Admin campaign edit remain untested; no campaign data changed.
- [x] Correct only the mobile hero against the supplied reference, including the front/profile-facing traveler photo; leave header, desktop and following sections untouched.
- [x] Verify mobile layout in four languages and four widths, country/model/campaign dialogs, no runtime errors and 66 passing tests; physical-device detection remains untested.
- [x] Refine hero only: photo-overlay heading, small upper ticket, lower device card and capsule search; preserve all surrounding sections.
- [x] Compare unchanged country/benefit dimensions across four locales and four widths; verify copy/search, 42 tests and screenshots. Physical device detection remains untested.
- [x] Apply October 8 Mediterranean terrace references separately for mobile/desktop, compact campaign/device overlays and single country search.
- [x] Verify responsive layout, TR/DE/EN/AR and search/device/campaign behaviors; capture mobile/desktop screenshots without publishing. Real-device detection and an actual Admin campaign edit remain untested; no campaign data was changed.
- [x] Match supplied pasaport.io reference on mobile in the selected stacked layout; preserve desktop and existing functions.
- [x] Verify TR/DE/EN/AR at 360/390/430 and desktop, campaign copying and 67 regression tests; standalone screenshots captured.
- [x] Compact mobile hero for 390×740, ensure headings clear header, move benefits after countries; preserve desktop and functionality.
- [x] Verify standalone preview from page top and share screenshot; TR/DE/EN/AR at 360/390/430/1440, 44px controls, copy and search passed.
- [x] Match latest compact mobile reference; preserve desktop, campaign, search and device logic.
- [x] Remove fixed bottom menu and validate 360/390/430px, desktop, languages and interaction.
- [x] Apply approved seaside eSIM hero with existing country search and integrated device checker.
- [x] Move homepage campaign into hero and extend existing Admin localized display fields and refresh.
- [x] Prevent initial wrong-language flash; verify locale priority and Arabic RTL.
- [x] Validate 390px/1440px appearance and simulated browser/device scenarios without publishing; physical Android/iPhone unavailable.

## Done
- [x] Pasaport full project migration audit (READ ONLY) — report delivered.

## Blocked / waiting
- Database data import — export buckets are empty; need the original project's export uploaded before data can be restored.
- Media/storage files copy — media bucket empty in new project.
- Secret values re-entry — ESIM_GO_API_KEY, NEWSLETTER_UNSUBSCRIBE_SECRET, VIGNETTE_ID_SANDBOX_API_KEY.
- OAuth (Google/Apple) reconfiguration for the new project.
- Old domain references (wanderpath-engine.lovable.app) — await approved target domain before rewriting.
- Multi-currency implementation — deferred until migration verified.
