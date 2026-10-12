# Pasaport.io — End-to-end test plan (new server, isolated test database)

Run ONLY against a separate test database. Never against production.

## 0. Environment setup (not applied to the current live database)
1. Restore schema: `db/baseline/0000_baseline_schema.sql`, then `drizzle/migrations` in order.
2. Additive test-isolation migration (to be written on the new server):
   - `is_test boolean NOT NULL DEFAULT false` on `orders`, `order_items`, `provisioning_units`, `customer_esims`, `payment_transactions`.
   - `test_accounts (user_id uuid primary key)` table, admin-managed; server checks membership or admin role before any test flow.
   - Analytics/finance queries filter `is_test = false` (logic mirrors `revenueTotals` in `src/domain/commerce/checkout.ts`).
3. Insert 1–2 TEST eSIM products (`is_test = true`, provider = mock) — never edit real retail prices.
4. Server wiring: `createMockPaymentGateway({ testEnvironment: true })` and `createMockSupplier({ testEnvironment: true })` enabled only when an env flag such as `TEST_ENVIRONMENT=true` is set on the test server.
5. Live supplier ordering stays disabled; confirm no eSIM Go credentials on the test server.
6. Create test users: `test-a@…`, `test-b@…` (in `test_accounts`), plus one admin.

## Scenarios (mobile 390px and desktop 1440px)
| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Successful mock payment | test-a: product → cart → /odeme → "Simulate success" | Order TEST, PAID→COMPLETED; DEMO eSIM in My eSIMs; QR marked DEMO; install guide; data + validity shown |
| 2 | Failed mock payment | "Simulate failure" | Payment FAILED; no eSIM; no supplier call; clear message |
| 3 | Duplicate payment event | Replay the same event id | Ignored; still one order, one eSIM |
| 4 | Duplicate submit | Double-click / resend same cart key | One order |
| 5 | Provisioning failure + retry | Mock supplier `failNext("RATE_LIMITED")` | Order FAILED fulfillment, admin alert; admin "Retry" → FULFILLED |
| 6 | Timeout (unknown result) | `failNext("TIMEOUT")` | Retry disabled; "Reconcile" → PROVISIONED with no second purchase |
| 7 | Unauthorized access | Signed out and test-b open test-a order/eSIM URLs | Sign-in prompt / not found; no QR data returned by server |
| 8 | Non-test visitor | Ordinary account opens /odeme | Only "Payment integration pending"; no mock buttons; server rejects test calls |
| 9 | Admin view | Admin → Orders, filter TEST; Fulfillment; Audit log | Test orders separate; statuses, attempts, errors visible; no activation secrets shown |
| 10 | Reporting isolation | Admin → Finance / Analytics | Test orders excluded from revenue |

## Proof of no real purchases
- Supplier call counter of the mock supplier equals expected calls.
- No outbound requests to supplier hosts (check server logs / network).
- `payment_transactions` rows only with `is_test = true`.

## Automated coverage already in place
`src/domain/commerce/__tests__/checkout-journey.test.ts` covers scenarios 1–7 and 10 in memory.
