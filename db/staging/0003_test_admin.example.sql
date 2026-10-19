-- Manual. Do not apply automatically. Do not use a real customer account.
-- 1. In the owner Supabase Auth UI create email/password user:
--      staging-admin@example.test
-- 2. Copy that user's UUID.
-- 3. Replace the placeholder below, then run this file yourself after approval.

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
