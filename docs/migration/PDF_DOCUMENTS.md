# PDF document system (Phase 6)

Status: renderer, admin preview and template management are live in Admin → Belgeler (PDF).
Real document issuing, numbering tables and PDF storage are designed but NOT created or enabled.

## Runtime dependencies (all portable)
- `pdf-lib` + `@pdf-lib/fontkit` — pure JavaScript; runs on Cloudflare Workers, Node 18+ and in tests. No Chromium, no headless browser, no WebAssembly, no Lovable service.
- Arabic shaping by fontkit; `render.ts` splits script runs and lays out right-to-left.
- Fonts in `src/assets/fonts/` (keep `OFL.txt` with them): Noto Sans Regular/Bold (Latin + Cyrillic subset) and Noto Sans Arabic Regular/Bold, ~600 KB, SIL Open Font License. Inlined into the server bundle, so no file system or network access at runtime.
- Japanese, Korean, Chinese: no font yet → rendered in English with a visible notice. To add: subset Noto Sans JP/KR/SC to the label characters and add them to `RENDERABLE_LOCALES`.

## Database (applied)
- `0006_align_email_template_grants` — removes the broad default privileges anon/authenticated had on the three e-mail tables, restores the intended grants, blocks TRUNCATE on e-mail versions.
- `0007_pdf_template_system`:
  - `pdf_templates` (kind PK: invoice, order-summary, credit-note, esim-guide; name, description, active, current_version)
  - `pdf_template_translations` (template_kind, locale ∈ 14 languages, labels jsonb, draft flag; unique per kind+locale)
  - `pdf_template_versions` (full snapshot per version; append-only: UPDATE/DELETE/TRUNCATE raise)
  - Grants: none for anon; authenticated only the minimal set; RLS = `public.is_admin()` on all three.
- Server code checks the admin role first, then reads/writes; every change writes a new version and an audit-log entry.

## Template format
JSON `{ format: "pasaportio.pdf-templates", version: 2, templates: [{ kind, name, description, active, translations: { <locale>: { labels, draft } } }] }`.
Labels are plain text (never HTML), all keys of `LABEL_KEYS` required, max 600 characters, TR/DE/EN mandatory. Import shows a per-language diff and writes new versions; it never deletes templates. The code seed (`seedPdfBundle`) can rebuild everything on a fresh server.

## Future issuance (designed, not applied)
SQL draft: `docs/migration/pending/document_issuance.sql`.
- Numbering: `PSP-INV-YYYY-NNNNNN` and `PSP-CN-YYYY-NNNNNN`, one counter per series and year in `document_sequences`, allocated by `next_document_number()` inside the same transaction as the document insert → gap-free, concurrency-safe (row lock), no number burnt on rollback.
- Tax: prices are gross; net/tax derived per line in integer cents with half-up rounding only when the owner has defined a rate (`money.ts`). No rate is ever invented; tax scheme and rates come from the owner's accountant and are snapshotted in each document.
- Cancellation/refund: issued documents are immutable and never deleted. A refund or cancellation creates a credit note linked to the original invoice (`original_document_id`) and the refund request (`refund_request_id`); only a PROCESSED/REFUNDED refund with confirmed payment refund may issue one.
- Ownership: each document carries `user_id` + `order_id`; customers read only their own rows (RLS); admins all.
- Storage: private bucket/object store, key `<user_id>/<document_id>.pdf`, SHA-256 stored. Downloads only through an authenticated server function that checks ownership and streams the file or returns a short-lived signed URL (≤ 60 s). Never public URLs.
- Enable only behind `documents_issuing_enabled` (default off) after issuer data + payments are approved.

## Code
- `src/domain/documents/catalog.ts` — kinds, labels seed, data shape, synthetic samples.
- `src/domain/documents/transfer.ts` — validation, JSON format, diff, seed.
- `src/domain/documents/money.ts` — numbering + tax rules.
- `src/domain/documents/render.ts`, `fonts.server.ts` — renderer.
- `src/lib/documents.functions.ts` — admin-only list/save/restore/export/import/preview.

## New-server tests (also in MIGRATION_CHECKLIST)
1. Run migrations 0006/0007; confirm anon has no privileges and a normal customer sees 0 rows on all six template tables.
2. Admin → Belgeler: load seed (if empty), preview all 4 kinds in TR/DE/EN/AR, check RTL and the EN fallback notice for JA.
3. Save an edit → new version; restore an older version; export JSON, re-import → "değişiklik yok".
4. Download a sample PDF and open it; confirm "ÖRNEK" stamp and no customer data.
