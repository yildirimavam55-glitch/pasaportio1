# Roadmap — Phase 5

- [x] Final homepage safe fixes and report: shared sticky search, CMS media overrides/fallbacks, deduplicated country/region rails, Global card, no homepage comparison, compact reviews, existing Admin image controls. 152 tests, 8 theme/viewport checks, 14 locale checks and build OK; screenshots/report delivered. No data writes/payments/publish.
- [ ] Verify actual Admin upload/replacement → draft save → refresh → public readback: blocked by test account lacking admin role; publishing also needs explicit approval.
- [ ] Verify nonempty genuine review carousel UI/autoplay/expanded reading: blocked by no published genuine reviews in current public read.

- [x] Repair dark-only homepage/header local ink cascade; seven requested German headings/names computed as #F1F6F3 at 390/1440 (15.53–17.40:1), search 7.69:1; menu theme toggle/search opening/no overflow checked. Price tokens unchanged; mobile light pixels identical, desktop only dynamic banner price-loading pixels differed. 15 tests/build OK; screenshots delivered. No Hero, commerce, backend or publish changes.

- [x] Unify homepage light colors in scoped CSS; 390/1440 before/after, unchanged Hero pixels/section geometry, no overflow, checker/installation/FAQ/worldwide destination checked; 55 tests and build OK. Screenshots/report delivered; existing country-card click stays on /de and is reported, not changed. No backend, payments or publish.

- [x] Remove the step counter, step heading, description paragraph, Wi-Fi tip and OS-version note from under every installation animation; homepage preview and central guide now show only the phone scene, its educational caption, numbered step navigation and play control, with the current step announced to screen readers only. 37 unit tests, build OK, 390/1440 mobile/desktop screenshots, step-jump and no-page-overflow checks passed. Post-installation, troubleshooting, device check, owner data and QR/link tabs preserved; UI only, no publish.

- [x] Add demo email → simulated copy → settings → paste scenes to central Android/iOS manual flows only; 93 browser step checks at 320/390/1440, playback/reduced-motion, no clipboard writes, 24 unit tests and build OK; five screenshots/report shared. QR/link/homepage, email delivery and backend preserved; no publish. New copy TR/DE/EN, other locales may fall back to English; real-device installation not tested.

- [x] Rebuild central manual phone interiors as distinct original Samsung/iOS settings screens; five requested 390px screenshots visually inspected, 32 manual step states at 390/1440, 12 TR/EN/AR small-screen checks and 24 unit tests passed; build OK, sources/report delivered. Homepage, credentials and backend preserved; no publish. QR/link redesign remains deferred pending the user's visual approval; complete 14-language translation and real-device installation are not verified.

- [x] Upgrade central educational guide: six platform/method flows, playback, safe phone scenes and troubleshooting; 21 tests, 12 browser flow scenarios/70 step selections at 390/1440, playback/pause/cancellation and reduced motion verified; 14-locale overflow checked (new non-TR/DE/EN strings may fall back to English). Screenshots/report shared; homepage preview branch and owner reads preserved, no publish. Real install/account-credential end-to-end not tested.

- [x] Compact below-hero trust with fully static icons and earlier mobile country names/prices; Hero dimensions and markup preserved, mobile visual discovery gap 32px; six widths, arrows, touch swipe, country selection and screenshots checked, 38 existing tests passed. Short screens cannot show every price in the first viewport. UI only, no publish.

- [x] Premium single homepage trust row below untouched Hero; existing CMS claims preserved, one-shot icons, 32px mobile/36px desktop discovery gap; six widths, 14 locales, carousel arrows/mobile swipes, reduced motion and screenshots/report checked. UI only; no publish. No new country-count, activation-time or payment assurance claims added without evidence.

- [x] Refresh only worldwide homepage banner with optimized generated travel still-life; 390/1440 before/after dimensions, text/prices, hero images and clicked Global destination verified unchanged; sources/screenshots reported, build OK (no publish).

- [x] Replace homepage phone trio with brand-specific representative imagery and icon fallback; 43 tests passed, real catalogue Samsung/Apple/Google/Xiaomi brand→model→result and unknown/Samsung detection verified at 390/1440; 90px height at five sizes. POCO mapping unit-tested only: no POCO catalogue rows, no fabricated entries. Sources/screenshots reported; UI only, no publish.

- [x] Add illustrative phone imagery only to the compact homepage compatibility card; 90px height and checker opening verified at 320/360/390/430/1440, 27 tests passed, mobile/desktop screenshots saved. No backend or publishing changes.

- [x] Compact homepage phone compatibility card only: banner-aligned width, 88px height, short copy in 14 languages, collision-only WhatsApp movement; 320/360/390/430/1440 real catalogue brand/model/result checks and 27 unit tests passed. No backend or publish.

- [x] Restore shared homepage installation preview with 3-second autoplay; pause/manual navigation, central manual guide and reduced motion preserved. 320/390/1440 browser checks and 14 unit tests passed; build OK.

- [x] Show owner-approved sample comparison prices only in preview with localized disclosure and animated common-scale bars; 32 tests passed, 390/1440 render confirmed (presentation only).
- [x] Compare uploaded Screen_Recording_20261013_125243_Chrome.mp4 reference frame with the shared central installation guide.
- [x] Consolidate installation entry points into the existing central guide; shared Link/QR/Manual and post-installation walkthroughs, owner-scoped reads, 72 scenario groups at 320/390/1440, 52 unit tests; screenshots/report saved. Guest credentials stay in token-authorized delivery; real QR/APN/guest token end-to-end unavailable (UI only; no backend or publish).

- [x] Restore only the homepage horizontal comparison presentation; history traced, verified comparable prices required, search/details preserved, 320/390/1440 and 14-language checks passed; before/after saved. No verified live comparison entries available, so tracks remain empty.

- [x] Shared numbered installation step navigation for public/account guides; edge-disabled arrows, aligned controls, 320/360/390/430/1440, DE/RTL and before/after checks (UI only).

- [x] Compact account cards/menu and shared QR/manual installation walkthrough; disabled Link coming soon; 390/1440 before/after and safety checks (UI only).

- [x] Account V1 reference: compact grouped eSIM rails, four square actions, safe 14-day refund information, compact account links, detail layout, 390/1440 screenshots and interaction tests (UI only).

- [x] Add three owner-approved TEST eSIM packages to the specified real account without orders, payment or activation credentials; normal account shows TEST 1/2/3 and persisted detail opens without demo opt-in.

- [x] Premium eSIM account presentation: video-reference cards, shared installation sheet, compact navigation, preview isolation and 390/1440 flow checks (frontend only).

- [x] Migration checklist incl. eSIM Go 403 task (docs/migration/MIGRATION_CHECKLIST.md)
- [x] Visible brand "travely" → "pasaport.io" (code; technical keys unchanged)
- [x] Missing translations for 11 overlay languages, guides hub redirect, Arabic price direction
- [x] Sign-in review (Google/Apple) — no account changes
- [x] E-mail template system: 9 templates (TR/DE/EN, EN fallback), Admin → E-postalar, versions + restore, JSON export/import — sending stays off
- [ ] Brand name inside database content (CMS/theme rows) — needs approval (data change)
- [ ] Support e-mail address destek@travely.app — needs new mailbox from owner
- [x] Full hosting & migration audit (read-only) — 6 docs under docs/migration/
- [x] Full DB + image backup 12.10 (private copy + downloadable zip, restore test passed)
- [ ] 4 missing media records — owner reviews later
- [x] Phase 6 PDF: renderer (TR/DE/EN, AR draft RTL, other languages EN), Admin → Belgeler preview, numbering/tax rules (off)
- [x] Phase 6 PDF: template tables (0007), editing, versions/restore, JSON import/export
- [x] E-mail table grant fix (migration 0006)
- [ ] Document issuance (numbering, issued docs, private storage) — SQL drafted, waits for issuer/tax data + payments approval
- [ ] CJK fonts for PDFs (ja/ko/zh) — later
- [ ] Real issuer/tax data for invoices — owner input
- [x] 0008 final hardening drafted + isolated retest (pending folder only)
- [x] Pre-live backup + isolated restore + 0008 rollback retest (12.10 13:35 UTC)
- [ ] Apply 0008 live (+ 0008_app_patch) — waits for owner approval
- [ ] Apply 0009 margin flag + 0009_app_patch together with a publish — waits for owner approval
- [ ] Close supabase_admin default privileges as superuser on the new server
