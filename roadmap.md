# Roadmap

## Current request
- [ ] Match latest compact mobile reference; preserve desktop, campaign, search and device logic.
- [ ] Remove fixed bottom menu and validate 360/390/430px, desktop, languages and interaction.
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
