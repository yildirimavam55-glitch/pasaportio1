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
