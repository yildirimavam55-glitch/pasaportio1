# Travely Security Baseline (owner-controlled)

Status: ACTIVE since 2026-09-28. Owner: Travely platform owners.

This file defines the minimum mandatory security rules. Security-sensitive changes must keep them. AI or Lovable may inspect, audit, test safely, report and propose fixes. It may implement only a security task the owner has explicitly approved. It must never redefine, weaken, remove or bypass a control on its own.

## Governance rules
1. **No AI runtime authority.** AI never decides who is Admin, who can see customer data, whether an order is PAID, whether a refund is approved, whether an eSIM may be provisioned, whether supplier cost may be exposed, or whether RLS, auth or rate limits may be bypassed. Deterministic server and database logic enforces all of these.
2. **No security by frontend.** Hiding a button is not authorization, and hiding a field is not data protection. The database (RLS and column privileges) and the server (`requireSupabaseAuth`, `adminDb`/`assertAdminRole`) enforce security.
3. **Fail closed.** If a feature or migration conflicts with a control, STOP and report `SECURITY-SENSITIVE CHANGE REQUIRED`. Include what must change, why, the security impact, safer alternatives, and the exact files, tables and functions. Wait for owner approval. Never "make it work" with any of these:
   - disabling RLS
   - making a table public
   - using the service role in the browser
   - removing auth or Admin checks
   - exposing secrets or QR data
   - removing rate limits
4. **Owner-only changes** (never ordinary CMS or Admin settings):
   - RLS
   - the role architecture
   - secrets and their rotation
   - supplier credentials
   - payment and webhook configuration
   - rate-limit values
   - this baseline
5. Every security-sensitive change needs an entry in `SECURITY_CHANGELOG.md`, which is append-only and holds no secrets.
6. `src/security/security-baseline.test.ts` is permanent. Never delete or weaken it to make a build pass.

## Security-critical areas
- Authentication and authorization
- Admin roles
- RLS
- Customer ownership
- Service-role access
- API secrets and eSIM Go credentials
- Supplier API access
- QR, activation data and ICCID
- Pricing authority and supplier cost protection
- Order state machine and payment state
- Provisioning
- Refunds
- Webhook verification
- Rate limiting
- Audit logs
- Security headers
- Storage access
- Service kill switches

## Mandatory rules
- **Database.** RLS stays enabled on every protected table. Customers can reach only their own profile, orders, items, eSIMs, QR and activation data, refunds, payments and personal data.
- **Column privileges.** Browser roles (anon and authenticated) have column-level SELECT on `service_products`, `esim_product_details` and `lounge_product_details`. The following columns are never granted:
  - supplier cost and currency
  - pricing snapshot and rule
  - override and review flags
  - `provider_metadata`

  New columns on these tables start out hidden. Granting one to browser roles needs owner approval.
- **Admin.** A server-side `has_role` check through the caller's own session must pass before any privileged access (`src/lib/admin-guard.ts`). The client never assigns roles, and admin authority never comes from localStorage or the URL.
- **Secrets.** Secrets stay server-only (`process.env` inside handlers). They never appear in `VITE_` variables, client code, analytics, logs, API responses or reports.
- **Supplier.** Customers never receive supplier credentials, cost, margin or raw provider responses. `validateProductForCheckout` requires a signed-in customer, works only on published products, is rate-limited, and returns a decision only.
- **Payments** (when enabled later). Only verified provider webhook events, with signature and idempotency checks, may set PAID. Redirects, query parameters and client state are never trusted. Today only the Admin-gated `confirmTestPayment` path exists, behind `commerce.test_payments`.
- **Provisioning.** Provisioning is Admin- or server-triggered only, after the server confirms the order is PAID, and it is idempotent. Live supplier purchases stay off unless the server variable `COMMERCE_LIVE_PROVISIONING` is set to `true`.
- **Refunds.** Customers can only request a refund. APPROVED status and the amount are set server-side by Admin. REFUNDED requires a confirmed payment refund, which the database trigger enforces.
- **Rate limits.** Values are in `src/domain/security/rate-limits.ts` and are enforced server-side. The limiter fails closed. Changes need owner approval.
- **Kill switches.** Admins control them. AI never pauses, resumes, enables or disables commercial services in production.
- **Security status page.** `/admin/security` is read-only and deterministic, with no switches. It shows only safe, high-level information and nothing about secrets or internals.
