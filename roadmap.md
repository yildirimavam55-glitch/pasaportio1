# Roadmap

## Current request
- [ ] Apply October 8 Mediterranean terrace references separately for mobile/desktop, compact campaign/device overlays and single country search.
- [ ] Verify responsive layout, TR/DE/EN/AR, search/device/campaign behaviors; share mobile/desktop screenshots without publishing.
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
