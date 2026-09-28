-- Security Phase 2: remove anonymous EXECUTE from admin/role SECURITY DEFINER functions.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.accept_admin_invitation()',
    'public.cancel_admin_invitation(uuid)',
    'public.invite_admin(text, text, text)',
    'public.list_admin_users()',
    'public.log_admin_action(text, text, text, jsonb, jsonb)',
    'public.refresh_admin_invitation(uuid, text)',
    'public.revoke_admin(uuid)',
    'public.has_role(uuid, public.app_role)',
    'public.is_admin()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;
-- Signup trigger function: fired by the database only, never called via the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;