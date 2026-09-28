# Security Control Matrix

No secret values appear in this file. "Owner-approved" means an explicit owner-approved development task, plus a changelog entry and passing baseline tests.

| Control | Enforcement location | Who may change it | Status | Last verified |
|---|---|---|---|---|
| Customer isolation (profiles, orders, items, eSIMs, refunds, payments) | Database RLS scoped to `auth.uid()` | Owner-approved migration | ACTIVE | 2026-09-28 (anonymous live probe; source tests) |
| Supplier cost protection | Database column privileges plus server response shape | Owner-approved migration or code change | ACTIVE | 2026-09-28 (anonymous REST call for `provider_cost` rejected) |
| Checkout validation (P1-2) | Server: auth, published-only, rate limit, no cost in response | Owner-approved code change | ACTIVE | 2026-09-28 (source tests) |
| Admin authorization | Server (`has_role` before privileged access) plus database `is_admin()` policies | Owner-approved change | ACTIVE | 2026-09-28 |
| Role table writes | Database: no customer write policy on `user_roles`; grants only through security-definer admin functions | Owner-approved migration | ACTIVE | 2026-09-28 (`security_baseline_status`) |
| Secrets server-only | Server `process.env` inside handlers; no `VITE_` secrets | Owner (secret rotation) | ACTIVE | 2026-09-28 (source tests; built bundle not scanned) |
| QR / activation / ICCID | Database RLS (owner and Admin) plus authenticated account views | Owner-approved migration | ACTIVE | 2026-09-28 |
| Rate limiting (P1-3) | Server with a database counter (service-role only); fails closed | Owner-approved code change | ACTIVE | 2026-09-28 |
| Payment state (PAID) | Server: Admin-gated test path only; real payments not implemented | Owner-approved change | Real payments DISABLED | 2026-09-28 |
| Provisioning | Server: Admin-only, idempotent, live calls off by default | Owner-approved change | ACTIVE (live OFF) | 2026-09-28 |
| Refund authority | Server plus database trigger (immutable snapshots; REFUNDED needs a confirmed refund) | Owner-approved migration | ACTIVE | 2026-09-28 |
| Audit log | Database: append via security-definer function | Owner-approved migration | ACTIVE | 2026-09-28 |
| Storage | Private `media` bucket | Owner-approved migration | ACTIVE | 2026-09-28 |
| Kill switches | Server feature flags; Admin-only | Admins through the Admin UI (not AI) | ACTIVE | 2026-09-28 |
| Security headers (CSP, framing, Permissions-Policy) | Server | Owner-approved change | NOT YET IMPLEMENTED (P2) | 2026-09-28 |
| Webhook verification | Server route with signature and idempotency checks | Owner-approved change | NOT YET IMPLEMENTED (no payments) | 2026-09-28 |

## Phase 2 controls (2026-09-28)
| Control | Enforcement | Authorized changer | Status | Last verified |
|---|---|---|---|---|
| Security headers (CSP report-only, frame-ancestors, Permissions-Policy) | `src/security/headers.ts` via `src/server.ts` | Owner-approved dev | ACTIVE (CSP report-only) | 2026-09-28 |
| Admin/account noindex | `X-Robots-Tag` + robots.txt | Owner-approved dev | ACTIVE | 2026-09-28 |
| Admin DB functions not anonymous | EXECUTE grants | Owner-approved migration | ACTIVE | 2026-09-28 |
| Public settings projection | `toPublicSettings` | Owner-approved dev | ACTIVE (table policy still public) | 2026-09-28 |
| JSON-LD escaping | `safeJsonLd` | Owner-approved dev | ACTIVE | 2026-09-28 |
| Payment launch gate | `PAYMENTS_LIVE` guard + test | Owner | ACTIVE | 2026-09-28 |
