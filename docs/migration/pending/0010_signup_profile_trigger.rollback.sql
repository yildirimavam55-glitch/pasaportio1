-- Rollback for 0010 (PENDING). Restores the pre-0010 state exactly.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC, anon, authenticated;
