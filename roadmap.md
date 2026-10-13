# Roadmap — Phase 5

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
