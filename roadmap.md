# Roadmap

## Current request
- [ ] Fix both installation phones; verify every phase/method, TR/DE/EN/AR, six widths, enlarged text and live language switching; provide screenshots, no publication.
- [x] Existing /account?demo=1 and /account/esims?demo=1: authenticated preview-only three independent demo cards, single-open accordion, editable demo nicknames, four filters, used-percentage bars, <10% warning, isolated installation/top-up/refund/notification simulations. Session notification/refund guard survives refresh; real purchases/counts/orders untouched. Activation-history server refund verdict blocks active/past activation/unknown history/completed requests and fails closed on request-history read errors. 33 focused tests pass; 16 TR/DE/EN/AR width checks (360/390/430/1440), accordion, filters, per-package simulation dialogs, nickname, pending duplicate and notification refresh verified; build OK. No charges, provisioning, writes, dependencies, migrations or publication. Actual real-refund backend execution not tested (no eligible real record); 7 existing security SQL-history assertions fail because prior migration files are absent; security tests/baseline unchanged.
- [x] Add shared reveal-once homepage entrances (14px/500ms, 60ms card stagger capped at 250ms), sanitized global Theme toggle and independent 400px resource preparation using existing queries. Verified 360/390/430/1440, slow scrolling/upward return, fast bottom/anchor jumps, three automatic review transitions without page movement, reduced motion, preview-theme disable and throttled connections. Initial CLS 0.00028–0.00546; no horizontal overflow or review vertical scroll containers, emulated vertical touch scrolls the page. 37 tests pass; build OK. No publication or saved Admin changes; physical device and actual Admin save/publish round-trip not tested.
- [x] Fix existing reviews only: verified weighted aggregate or localized unavailable state; source-preserving locale priority, translated labels and original text; Embla horizontal loop with naturally sized non-scrolling track and expanded-reading pause. 27 tests pass; 360/390/430 and desktop checks, four-language simulated verified/missing data, browser-emulated vertical/horizontal touch, three six-second transitions, final-to-first loop, hover/reduced-motion/offscreen and long translation expansion passed. No page overflow, internal scroll or autoplay page movement; no publication. Physical phone and background-tab tests not performed.
- [x] Refine only reviews: localized heading, 120px mobile shared weighted rating panel, 210px collapsed cards at 88% width, four-line inline expansion and at most five dots. Verified 16 language/width combinations at 360/390/430/1440 with no overflow/runtime errors; autoplay, hover/focus pause, reduced-motion and injected long-text expansion passed. 21 focused tests passed; broader trust suite retains one pre-existing public-demo-host expectation failure. No publication, no Admin/data changes; physical swipe and actual Admin save not tested.
- [x] Trust row below the compatibility selectors: third item is "14 gün iade" (DE/EN/AR) with a calendar icon linking to the refund page; row now reads its icon, localized label, link, visibility and order from the existing Admin homepage section instead of hardcoded copy. 6 new tests plus the storefront suite pass; saved values verified in the preview at 390/1440. No publication.
- [x] Trust row below the compatibility selectors: third item becomes "14 gün iade" (DE/EN/AR given) with an outlined calendar/return icon in the existing petrol stroke, linking to the existing localized refund policy page; other three items unchanged. Wire the row to the existing homepage/theme editor so icon, localized label, link, visibility and order are editable and persist to the storefront; remove hardcoded overrides, reuse existing settings, keep the compact four-column layout. Verify TR label and an admin edit round-trip. No publication.
- [x] Remove the standalone phone-compatibility block below the "Dünya çapında" section from default and published layouts; keep hero checker, section type re-addable by Admin, and verify 360/390/430/1440 in TR/DE/EN/AR. No publication.
- [x] Replace only closed hero gift with localized 196×60px mobile / 232×68px desktop coupon ticket; verify 16 width/locale combinations, keyboard/popup close, active campaign and simulated null inactive response. 13 tests passed; no Admin campaign data changed, no publication.
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
- [x] Demo eSIM paketleri yildirim.avam55@gmail.com hesabına (test)
