-- PENDING DRAFT — NOT APPLIED. Requires separate owner approval.
-- Reconnects the existing public.handle_new_user() (lost on restore) to auth.users.
-- Function is idempotent (ON CONFLICT DO NOTHING), only uses NEW.id, never overwrites.
-- Guests never become auth users, so they never get a profile.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Verification (read-only, after apply):
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;  -- expect on_auth_user_created
--   select count(*) from public.profiles;  -- unchanged (no backfill)
