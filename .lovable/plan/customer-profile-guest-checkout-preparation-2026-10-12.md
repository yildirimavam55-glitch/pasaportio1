# Customer profile + guest checkout preparation

Nothing is applied until you approve. Database steps need a second, separate approval.

## A. What already exists
- `public.handle_new_user()` (SECURITY DEFINER, fixed search_path): inserts the profile with `on conflict (id) do nothing` and the `customer` role. It is idempotent, never overwrites, and only uses `new.id`.
- The baseline file creates the `on_auth_user_created` trigger on `auth.users`. That trigger is not in the live database: it lived outside the public dump and was lost on restore. This is the "disconnected" part.
- Profile save (`customer-account.functions.ts`) upserts only the caller's own row, so it is owner-scoped.
- `orders` already has nullable `customer_id`, plus `guest_email`, `guest_claim_token`, `locale`, `currency` and `idempotency_key`.
- `domain/commerce/checkout.ts placeOrder` provides validation, server-side pricing, idempotency, a mock gateway and the provisioning engine. It is tested in memory only.
- `/odeme` shows "signed in as" or a sign-in link. It does not force login.
- The admin feature flag `guest_checkout` and the admin order list already show guest emails.
- The animated guides at `/esim/kurulum` and the account eSIM/QR screens are in place.

## B. What is missing
1. The signup trigger on `auth.users` (live).
2. Guest support in `placeOrder`, which needs `customerId` today: it needs an `email` + `locale` input for guests, and the idempotency lookup needs to be keyed per guest.
3. The live `/odeme` is not connected to `placeOrder`. No server function places orders yet, which is intentional because payments are postponed.
4. Delivery access: no hashed, expiring token storage, no guest delivery page, no renew-by-email flow and no claim flow.
5. The delivery email template has no "Install my eSIM" link variable. It must never contain the QR code or the activation code.

## C. Exact files and database objects
Code-only (safe now):
- `src/domain/commerce/checkout.ts`: accept `{ customerId } | { guestEmail, locale }`, carry `locale`, reject both or neither.
- `src/domain/commerce/__tests__/memory-store.ts` + `engine.test.ts`: guest tests (no profile, separate idempotency per guest, locale/currency kept).
- `src/domain/commerce/delivery-token.ts` (new, pure): generate a 32-byte random token and store only its SHA-256 hash with an expiry (default 72 h). Comparison is constant-time.
- `src/domain/commerce/delivery-token.test.ts`: tests for expiry, wrong token, and that only the hash is stored.
- Email template: add an `{{install_url}}` variable to the existing delivery template definition, plus a test that rendered output never contains LPA/SM-DP+/activation code.

Live database (separate approval; drafted as files only in `docs/migration/pending/`):
- `0010_signup_profile_trigger.sql`:
  ```sql
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
  ```
  - Affected: one trigger on `auth.users` and the function's EXECUTE grant.
  - Rollback: `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;` and re-grant EXECUTE.
  - Guests never become auth users, so no profile is created for them.
- `0011_guest_delivery_access.sql` (later): table `order_access_tokens(order_id, token_hash, expires_at, used_at)`. It is server-only (service_role grant, RLS on, no anon/authenticated policies), with a rollback file.
- Not touched: 0008, 0009, products, prices.

## D. Code-only vs live
- Code-only: everything under C "Code-only". All of it is tested in memory, with no orders, payments or emails.
- Live database: the 0010 trigger and the 0011 token table, each applied only after you approve it.
- Verification plan for 0010:
  - Before: confirm the trigger is absent.
  - After: confirm the trigger exists and `profiles` stays at 0 rows. Existing users are not backfilled.
  - Test: run a disposable signup in an isolated database copy (no live test account), and check that a second insert of the same id changes nothing.

## E. Smallest safe sequence
1. Code: guest input in `placeOrder` + tests.
2. Code: delivery-token helper + tests; add `install_url` to the email template, plus the no-secrets test.
3. Draft the 0010 SQL + rollback and test them in an isolated copy, then ask you before applying it live.
4. Later, after payments are approved: draft 0011, add the guest delivery page (reusing the account eSIM view and `/esim/kurulum` links), and build renew-by-email and claim (the email must match the order's `guest_email` and be verified through a sign-in link; the server compares it and moves `customer_id`).

Stops: no Stripe or Lovable Payments, no live orders, payments, provisioning or emails, no publishing, and no changes to the guides.
