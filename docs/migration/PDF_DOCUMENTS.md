# PDF document system (Phase 6)

Status: renderer + admin preview built. Template tables, numbering tables and real issuing are NOT created (awaiting approval).

## Runtime dependencies (all portable)
- `pdf-lib` + `@pdf-lib/fontkit` — pure JavaScript; runs on Cloudflare Workers, Node and in tests. No Chromium, no headless browser, no Lovable service.
- Arabic shaping is done by fontkit; `src/domain/documents/render.ts` handles script runs and right-to-left layout. No WebAssembly needed.
- Fonts: `src/assets/fonts/` — Noto Sans (Latin/Cyrillic) and Noto Sans Arabic, Regular + Bold, reduced to the needed alphabets (~600 KB total), SIL Open Font License (`OFL.txt`). Loaded as inline data from code, so no file system or network access is needed at runtime.
- Japanese, Korean, Chinese: no font bundled yet → these documents are produced in English, clearly labelled. To add them: subset Noto Sans JP/KR/SC to the characters the labels use, or load the full fonts from private storage at runtime.

## Code
- `src/domain/documents/catalog.ts` — 4 document kinds, labels (TR/DE/EN complete, AR draft needs a native-speaker check, other languages fall back to English), allowlisted data shape, synthetic samples.
- `src/domain/documents/money.ts` — number format `PSP-INV-YYYY-NNNNNN` / `PSP-CN-YYYY-NNNNNN`, gross→net/tax rules in cents, no invented tax rates, flag name `documents_issuing_enabled`.
- `src/domain/documents/render.ts` — layout and renderer; invoices and credit notes without issuer data are always stamped as samples.
- `src/lib/documents.functions.ts` — admin-only preview (synthetic data, nothing stored).
- Admin → Belgeler (PDF): type list, 14 languages, desktop/mobile preview, sample download, JSON download of the label seed.

## Pending (separate approval)
1. `pdf_templates`, `pdf_template_translations`, `pdf_template_versions` (admin-only, append-only versions) → label editing, version history, JSON import.
2. `document_sequences`, `issued_documents` (customer reads own rows only), feature flag row, empty `legal_issuer` settings.
3. Private storage + owner-checked download function. Never public PDF URLs.
4. Real issuer name, address, tax ID and tax rates supplied by the owner.

## Migration notes
- Nothing to export today besides the code. After the template tables exist, export them from Admin as JSON together with the e-mail templates.
- Keep the `src/assets/fonts/` files and `OFL.txt` together with the code.
