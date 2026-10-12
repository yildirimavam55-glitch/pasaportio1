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

## Preserving the admin identity (verified 12.10.2026: 1 user, Google-only, no password hash)
Option 1 — keep the same user id (preferred): with platform export approval, restore the owner's `auth.users` + `auth.identities` row unchanged. All links keep working (`user_roles`, `admin_audit_log.admin_user_id`, `cms_versions.created_by`, `customer_esims.customer_id`). Google sign-in matches by the stored Google subject id, which is the same for any Google OAuth client.
Option 2 — no auth export: on the new project enable Google with your own OAuth client, owner signs in once (creates a new user id), then in one SQL transaction: insert `user_roles(new_id,'admin')` and repoint `admin_audit_log`, `cms_versions`, `customer_esims` from old id to new id. Restore those 4 tables' FKs only after this step.
Checks after either option: `select public.has_role('<id>','admin')` = true; Admin pages open; a fresh customer test account gets "Yönetici yetkisi gerekiyor"; security test suite green.
Never grant admin through user metadata or the profiles table.
