# Phase 6 — Portable PDF document system (plan, nothing built yet)

## Audit findings (read-only, nothing changed)

**E-mail template tables vs. migration files**
- Migration `0005_email_template_system` is in the journal and contains all 3 tables, CHECKs, FKs, RLS enabled, the 4 admin-only policies, the append-only trigger and the 2 updated_at triggers. Live database matches on tables, RLS, policies and triggers.
- **Drift found: access grants.** The migration grants narrow rights (authenticated: SELECT/INSERT/UPDATE; versions only SELECT/INSERT; no anon). Live database gives anon and authenticated **all** rights (SELECT/INSERT/UPDATE/DELETE) on all 3 tables, through platform default privileges.
- Today this is still safe: RLS blocks everyone except admins (tested in Phase 5), and the trigger blocks version edits and deletes. But it is one safeguard instead of two, and a restored dump carries no grants at all.
- Proposed fix (needs your separate approval): a small migration `0006_email_template_grants` that revokes all rights on the 3 tables from anon and authenticated, then re-grants exactly what 0005 grants. Afterwards I rerun the RLS test in a throwaway database plus the live visitor check.

**What exists for PDFs today**
- No PDF library, no PDF fonts, no PDF code.
- Brand: Outfit (headings) + Manrope (body), petrol/mint palette, pasaport.io wordmark.
- Orders already have `order_number`, `customer_id`, `currency`, `locale`, `gross_revenue`, `discount_total`, `tax_total`, `refunded_total`. Refunds have `amount`, `currency`, `payment_refund_reference`.
- No company/legal-issuer data and no tax ID stored anywhere. That is correct for now: invoices cannot be legally valid yet.
- Storage: 3 private buckets (`media`, 2 old export buckets), all empty. No public bucket.

## Architecture

```text
Admin → Belgeler (PDF)            future: order/refund event (server only)
   │ edit / preview (sample data)        │
   ▼                                     ▼
 pdf templates (DB, versioned)  ──►  renderDocument(kind, locale, data)  ── pure TS, pdf-lib
                                         │  fonts bundled with the code (OFL)
                                         ▼
                              PDF bytes ──► preview: streamed to admin only
                                         └─► later: private storage + owner-checked download
```

- **Renderer:** `pdf-lib` + `@pdf-lib/fontkit` (pure JavaScript). Runs on Cloudflare Workers and Node, with no browser, no Chromium and no Lovable service. A layout module (`src/domain/documents/`) draws header, address blocks, line-item table, totals and footer from a shared design-token file.
- **Fonts (bundled, SIL Open Font License):** Outfit + Manrope for Latin, Noto Sans for Cyrillic and Polish/Turkish fallback, Noto Sans Arabic, and Noto Sans JP/KR/SC for Chinese/Japanese/Korean. Each document embeds only the characters it uses (subsetting), so files stay small.
- **RTL / Arabic:** pdf-lib does not join Arabic letters itself. Plan: add `harfbuzzjs` (WebAssembly, runs on Workers and Node) for text shaping, plus right-to-left table mirroring. **Risk:** this is the hardest part, so step 1 is a short test on Arabic + Chinese before any other work. Fallback if it fails: Arabic PDFs use English until it is solved, clearly labelled.
- **Templates:** the layout is code; editable text per language is data (titles, labels, legal notes, footer). Same model as the e-mail system: TR/DE/EN complete, other 11 languages fall back to English, append-only versions, JSON export/import, and a seed copy in code.
- **The four documents:**
  1. Invoice — fully designed, but stamped "MUSTER / ÖRNEK / SAMPLE — not a valid invoice" until real issuer data is entered and issuing is approved.
  2. Order summary — not a tax document.
  3. Refund / credit note — linked to the original order number and refund reference.
  4. eSIM installation guide — general steps only. The QR code and activation codes stay in the signed-in account, never in a PDF (same rule as e-mail).
- **Numbering, tax, references — designed but switched off:**
  - Number format e.g. `PSP-INV-2026-000001` / `PSP-CN-2026-000001`, one sequence per kind and year. Numbers come from the database, gap-free, and only when a real document is issued.
  - Tax: per-line net / rate / tax / gross from the server-side order totals, with rounding rules in one tested module. No rates are invented: the rate table stays empty until you supply it.
  - A feature flag `documents_issuing_enabled = false` blocks any real issuing.
- **Security:**
  - Preview uses synthetic data only and is admin-checked on the server.
  - The renderer only receives an explicit allowlisted data object. It never reads supplier costs, API keys, tokens, QR or activation data.
  - No public PDF URLs. Future customer downloads go through an authenticated server function that checks order ownership, then streams the file or returns a short-lived signed link from a private bucket.
- **Portability:** generation is plain TypeScript, and fonts and templates ship with the code plus DB rows plus a JSON export. Storage sits behind a small `DocumentStore` interface (database-backed bucket now, any S3-compatible storage later).

## Database impact (proposed; applied only after your separate approval)

New, all admin-only RLS with exact grants, following the e-mail tables:
- `pdf_templates` — key IN (`invoice`, `order-summary`, `credit-note`, `esim-guide`), name, active, current_version.
- `pdf_template_translations` — key + locale (14), labels jsonb (size-limited), legal note, footer.
- `pdf_template_versions` — append-only snapshots (trigger blocks update/delete).

Prepared for later, empty, locked by the feature flag:
- `document_sequences` — kind, year, last_number (only a security-definer function may increment it).
- `issued_documents` — kind, number, order_id, refund_request_id, customer_id, locale, template_version, storage_path, sha256, issued_at. Customers may read only their own rows; no deletes; credit notes reference the original invoice.

Plus one feature flag row and one empty `legal_issuer` settings entry. No change to products, prices, orders, refunds or accounts.

## Security risks

- Arabic/CJK rendering errors (wrong letter shaping) → test first, use a clear English fallback.
- A sample invoice mistaken for a real one → permanent watermark, no number, flag off.
- Customer data leaking through files → no public bucket, ownership check, short-lived links, allowlisted data.
- Numbering gaps or duplicates later → database sequence, unique constraints, issue inside one transaction.
- Large font bundle on Workers → subsetting; load CJK/Arabic fonts lazily only when that language is used.
- E-mail grant drift (above) → migration 0006 after approval.

## Implementation steps (after approval)

1. Test (no database): pdf-lib + fontkit + harfbuzzjs renders a one-page sample in TR, AR and ZH on Workers and Node; check size and timing.
2. Domain module: design tokens, layout, money/tax/number formatting (tests), allowlisted data shapes, synthetic samples, seed text TR/DE/EN.
3. Database migration (separate approval, schema + policies shown first): 3 template tables. 0006 e-mail grant fix in the same review.
4. Admin → Belgeler: list, language tabs, label editing, live PDF preview (desktop + mobile view), versions + restore, JSON export/import with validation and diff.
5. Prepared-but-off layer: sequences + issued_documents tables (separate approval), `DocumentStore` interface, owner-checked download function behind the flag.
6. Tests: renderer (no secrets in output, watermark present, RTL direction, fallback), numbering/tax rules, RLS tests (visitor/customer/admin) in a throwaway database. Visual QA of every page as images. Browser check of the admin screen at 1440/390.
7. Docs: `docs/migration/PDF_DOCUMENTS.md` (libraries, fonts + licences, tables, storage, flag), plus checklist updates.

## Technical details

- Libraries: `pdf-lib`, `@pdf-lib/fontkit`, `harfbuzzjs` (WebAssembly), fonts from Google Fonts / Noto (OFL) stored under `src/assets/fonts/`. No Puppeteer, Chromium or headless browser.
- Output is a `Uint8Array`, returned from an admin-checked server function as base64 for the preview iframe/object. Nothing is written to storage during development.
- Still not done in this phase: Stripe/payments, real invoices, supplier purchases, deployment.
