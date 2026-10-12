# Authentication migration plan

## Current state
- Auth system: Supabase Auth (managed by Lovable Cloud). Methods enabled (public settings, verified): email/password, Google, Apple. Signup open, email confirmation required.
- Accounts: 1 (owner, admin role in `user_roles`). 0 customers. `profiles` has 0 rows — check signup trigger on the new server.
- Google/Apple run through Lovable's OAuth broker (`@lovable.dev/cloud-auth-js`) — not portable.
- Auth e-mails (verify, reset) sent by the platform default mailer. Reset page `/reset-password` is in the app.
- The `auth` schema is not readable from this workspace; account details were not inspected. No credentials were accessed.

## Can users keep their passwords?
- **Yes, if** the new system is a Supabase project (hosted or self-hosted) and `auth.users` is restored with its `encrypted_password` (bcrypt) column. Supabase Auth verifies these hashes as-is.
- **Yes, likely,** for other providers that import bcrypt hashes (estimate — must be tested per provider).
- **No — reset required** if only an e-mail list can be exported.
- Today only the owner account exists, so the practical impact is minimal; owner can simply reset.

## Sessions & refresh tokens
Do not migrate. JWT signing keys differ on the new project → every session ends; users sign in again. Acceptable.

## Steps
1. Ask the platform for an export of `auth.users` + `auth.identities` (with hashes) — store encrypted, never in git.
2. Restore into new Supabase project before `public` data (FK `user_roles.user_id`).
3. Verify owner can sign in with the existing password; `has_role(owner,'admin')` = true.
4. Google: own OAuth client in Google Cloud; authorised origins + callback; enable in new auth settings; replace `lovable.auth.signInWithOAuth` with `supabase.auth.signInWithOAuth('google', { redirectTo: origin + '/auth' })`.
5. Apple: Services ID, key, team ID; same code swap. Hide the button until tested.
6. Redirect allow-list: only new domain(s) + `/reset-password`.
7. Configure SMTP/e-mail provider for auth mails; translate/brand templates (TR/DE/EN).
8. Test: signup + verify, sign-in, wrong password, reset, Google, Apple, sign-out, admin-only pages refuse a customer account, RLS tests.
