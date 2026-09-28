-- OWNER APPROVED (Security Phase 2.1, items #1 and #2)
-- #1: has_role only answers for the caller's own account (or trusted service role).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select case
    when _user_id is not null and (_user_id = auth.uid() or coalesce(auth.role(), '') = 'service_role')
      then exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
    else false
  end
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- #2: full platform_settings rows are Admin-only; public projection via allowlisted function.
DROP POLICY IF EXISTS "platform settings public read" ON public.platform_settings;
REVOKE SELECT ON public.platform_settings FROM anon;

CREATE OR REPLACE FUNCTION public.public_platform_settings(_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select case
    when _id = 'active' then jsonb_strip_nulls(jsonb_build_object(
      'brandName', s.data->'brandName',
      'supportEmail', s.data->'supportEmail',
      'supportUrl', s.data->'supportUrl',
      'maintenance', s.data->'maintenance',
      'whatsappWidget', s.data->'whatsappWidget',
      'refundTrust', s.data->'refundTrust'))
    when _id = 'seo' then jsonb_strip_nulls(jsonb_build_object(
      'organizationName', s.data->'organizationName',
      'defaultOgImage', s.data->'defaultOgImage',
      'twitterHandle', s.data->'twitterHandle',
      'hubs', s.data->'hubs'))
    else null
  end
  from public.platform_settings s where s.id = _id and _id in ('active', 'seo')
$$;
REVOKE EXECUTE ON FUNCTION public.public_platform_settings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_platform_settings(text) TO anon, authenticated, service_role;