# Security Change Log (append-only)

Never edit or delete past entries. Never record secrets here.

---

## 2026-09-28T13:55Z — Security baseline, and P1-1, P1-2 and P1-3 remediation
**Approved by:** owner task "SECURITY GOVERNANCE / LOCKED SECURITY BASELINE" (section 23).

### P1-1 Supplier cost exposure
- **Previous behavior:** Browser roles (anon and authenticated) could read every column of the three product tables, including `provider_cost` and `provider_metadata`, which contains the supplier price.
- **New behavior:** Browser roles get SELECT on an explicit list of safe columns only. The following stay hidden:
  - `service_products`: `provider_cost`, `provider_currency`, `pricing_snapshot`, `pricing_rule_id`, `price_overridden`, `pricing_review_required`, `priced_at`
  - `esim_product_details` and `lounge_product_details`: `provider_metadata`
- Three safe derived columns (`supplier_groups`, `supplier_speed`, `supplier_countries`) now carry the non-price supplier labels the storefront needs.
- **Admin access:** Admin server functions verify `has_role` through the caller's session. Their table access then runs server-side (`privilegedAdminDb`), and `.rpc()` keeps the caller's identity for audit logging.
- **Migrations:** column revoke and grants, then the generated columns.
- **Affected code:**
  - `src/lib/admin-guard.ts`
  - `src/lib/provider-hub.functions.ts`
  - `src/lib/provider-import.functions.ts`
  - `src/lib/test-catalogue.functions.ts`
  - `src/lib/esim-catalogue.functions.ts`

### P1-2 `validateProductForCheckout`
- **Previous behavior:** No authentication. Accepted any product ID, returned cost and margin, and triggered live supplier validation.
- **New behavior:** Requires `requireSupabaseAuth` and a UUID input. Works only on PUBLISHED, customer-visible products. Rate-limited to 20 per user per hour. Returns only the outcome, sale price and a message.
- **Affected file:** `src/lib/provider-validate.functions.ts`

### P1-3 Rate limiting
- **New:** A `security_rate_limits` table (service role only; RLS on, no policies). The `consume_rate_limit` function can be executed only by the service role. `src/lib/rate-limit.server.ts` enforces the limits and fails closed.
- **Limits:**
  - Coupon validation: 10 per minute per hashed IP, and 10 per minute per user
  - Refund requests: 3 per day per user
  - Order creation: 10 per hour per user
  - Checkout validation: 20 per hour per user
- **Affected handlers:** `validateCoupon`, `createRefundRequest`, `createEsimOrderRequest`, `validateProductForCheckout`

### Governance
- **New documents:** `docs/security/SECURITY_BASELINE.md` and `SECURITY_CONTROL_MATRIX.md`.
- **Admin page:** read-only `/admin/security`, backed by the admin-only `security_baseline_status()` function. There are no write endpoints.
- **Tests:** `src/security/security-baseline.test.ts`, 19 tests. Set `SECURITY_LIVE=1` to add the live anonymous probes. Everything passed.

---

## 2026-09-28T17:10Z — Phase 2 / P2 hardening
**Approved by:** owner task "SECURITY PHASE 2 / P2 HARDENING".

- **Security headers** (`src/security/headers.ts`, `src/server.ts`): CSP in report-only mode; enforced `frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN` on production hosts, Lovable-editor-only framing on preview hosts; conservative Permissions-Policy; `X-Robots-Tag: noindex, nofollow` on admin/account/auth/api/cart/checkout paths. Existing edge headers are not overwritten.
- **Admin DB functions** (migration): EXECUTE revoked from PUBLIC/anon on `accept_admin_invitation`, `cancel_admin_invitation`, `invite_admin`, `list_admin_users`, `log_admin_action`, `refresh_admin_invitation`, `revoke_admin`, `has_role`, `is_admin`; kept for authenticated (internal is_admin checks unchanged). `handle_new_user` no longer callable via the API. No RLS policy changed.
- **Platform settings**: public availability response now returns only storefront fields; operational fields stay Admin-only. Direct table read policy unchanged (owner approval required).
- **Dependency**: `js-yaml` overridden to 4.3.2 (build-time path via TanStack Start plugin → xmlbuilder2).
- **Provider sync**: public 500 response is generic (`SYNC_FAILED`); details logged server-side only.
- **Test payment**: `confirmTestPayment` also refuses when `PAYMENTS_LIVE=true`; launch-gate test added.
- **JSON-LD**: all structured data serialized through `safeJsonLd` (escapes `<`, `>`, `&`, U+2028/2029).
- **Robots**: `/admin`, `/account`, `/api/`, `/legacy-v1` disallowed (defence-in-depth only).
- **Status page**: four read-only deterministic checks added.
- **Tests**: `src/security/security-phase2.test.ts` added; existing baseline tests unchanged.

## 2026-09-28T17:15Z — Phase 2.1 — OWNER APPROVED items #1 and #2
**Approved by:** owner task "OWNER APPROVAL / SECURITY PHASE 2.1" (items #1, #2 only; #3 read-only audit).

- **OWNER APPROVED #1 — role lookup self-only**: `has_role` now answers only when `_user_id = auth.uid()` (or service role); any other lookup returns false. Anonymous EXECUTE remains revoked. RLS policies (`is_admin()` → `has_role(auth.uid(), …)`) and server guards (own `userId`) unchanged in behaviour.
- **OWNER APPROVED #2 — platform_settings private**: dropped policy "platform settings public read"; revoked anon SELECT. Admin access via existing `is_admin()` policy. New `public_platform_settings(_id)` returns only allowlisted fields (`active`: brandName, supportEmail, supportUrl, maintenance, whatsappWidget, refundTrust; `seo`: organizationName, defaultOgImage, twitterHandle, hubs). Storefront/SEO server reads switched to it.
- **Status page**: two deterministic checks added (`roleLookupSelfOnly`, `settingsTablePrivate`).
- **Tests**: `src/security/security-phase2-1.test.ts` added. CSP remains report-only; no auth settings, rate limits or other controls changed.

## 2026-09-28 — Auth Phase 3A (OWNER APPROVED: item 1 only)
- Enabled built-in leaked-password protection (HIBP) in the auth provider. Verified: signup with a known-leaked password is rejected (`weak_password`, reason `pwned`). No application code receives or checks passwords.
- Unchanged: signup enabled, email confirmation required, anonymous users off, MFA, redirect allowlist, provider rate limits, password length/complexity.

## 2026-09-29 — OWNER APPROVED: restore 3 protections missing after remix
- Migration `drizzle/migrations/0018_restore_security_protections.sql` (applied directly; remixed migration journal does not list 0000–0017).
- 1: `provider_cost` / `provider_metadata` column SELECT revoked from anon/authenticated (column grants for all other columns).
- 2: `has_role` self-only body re-asserted; EXECUTE on has_role, is_admin, list_admin_users, invite_admin, revoke_admin revoked from PUBLIC/anon.
- 3: `guard_refund_request` re-asserted, `refund_requests_guard` trigger ensured, new `refund_requests_guard_insert` blocks inserting REFUNDED without confirmed payment refund.
- Security tests now read `drizzle/migrations/*.sql` (assertions unchanged).

## 2026-09-29 — OWNER APPROVED: customer refund request insert hardening
- New BEFORE INSERT trigger `refund_requests_force_initial_state` (file `drizzle/migrations/0020_refund_request_force_initial_state.sql`, applied directly): every new refund request starts REQUESTED; non-server callers cannot set requester or amount fields. Existing guard triggers, policies and server refund logic unchanged. No customer INSERT policy exists; customers create requests only through `createRefundRequest`.


## 2026-10-09 — OWNER APPROVED: standard account refund activation guard
- Owner explicitly requested backend enforcement: active or historically activated eSIMs blocked, unknown activation blocked with support, confirmed never-activated packages eligible only within 14 days and without pending/completed requests.
- Existing authenticated owner-scoped refund reader/writer, rate limits, immutable snapshots, payment confirmation guards and RLS unchanged; no migration or financial action. Preview fixtures never call the refund writer.


## 2026-10-22 — Issue #2: V2 builder safety phase 1 (draft proposal)
Approved scope: owner request and issue #2. Restore now writes only the draft after Admin and document/version checks; force media deletion is removed; reference scans include theme/history and fail on incomplete reads; Storage/version/audit errors are surfaced. Tests remain unchanged except newly added independent offline safety checks. No migration was applied. Atomic CMS writes, concurrent media-reference safety and live RLS verification remain explicit release blockers; see docs/development/V2_BUILDER_SAFETY_PHASE1.md. No production/data/payment operations were performed.



## 2026-10-22 — Draft-PR #3 Nachprüfung: endgültige Medienlöschung gesperrt
Freigegeben durch den Eigentümer: Nachprüfung/Ergänzung des Draft-PR #3, keine Datenbankänderung. Der Server-Endpunkt verweigert endgültige Medienlöschung nach der Adminprüfung bedingungslos; die Adminaktion ist deaktiviert. Vorhandene 37 Tests bleiben unverändert, zusätzliche Handler-Integration prüft Löschsperre, Restore und Teilschreibfehler. Veröffentlichungsprojektion und Bigint-Revisions-/Privilegiengrenze liegen ausschließlich als nicht ausgeführte SQL-Vorschläge vor. Bekannte neun SQL-Testblocker bleiben offen. Kein Live-/Supabase-/Storage-/Account-/Produktzugriff und keine Migration/RPC/Veröffentlichung ausgeführt.
