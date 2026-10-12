-- Restore security protections lost when the database was copied from the
-- original project (owner-approved Phase 1 security repair). Idempotent:
-- only privileges and function definitions are touched; no data changes.

-- 1. Supplier cost protection: browser roles read only safe product columns.
REVOKE SELECT ON public.service_products FROM anon, authenticated;
GRANT SELECT (id, service_type, slug, name, lifecycle, primary_provider_id, provider_external_id, provider_available, provider_synced_at, currency, sale_price, customer_visible, featured, badge, sort_order, margin_flagged, destination_id, airport_id, created_at, updated_at, is_test, source) ON public.service_products TO anon, authenticated;

REVOKE SELECT ON public.esim_product_details FROM anon, authenticated;
GRANT SELECT (product_id, country_id, country_iso, region_id, coverage_country_isos, package_kind, data_gb, unlimited_data, validity_days, provider_bundle_id, network_operators, supports_5g, supports_hotspot, data_only, activation_policy, validity_start_rule, apn_info, topup_supported, raw_validity_value, raw_validity_unit, data_type, fair_use_note, fair_use_policy, high_speed_allowance, speed_after_fair_use, coverage_subdivision_codes, unlimited_details_complete, metadata_provenance, supplier_groups, supplier_speed, supplier_countries) ON public.esim_product_details TO anon, authenticated;

REVOKE SELECT ON public.lounge_product_details FROM anon, authenticated;
GRANT SELECT (product_id, airport_id, iata, terminal, lounge_name, airside, departure_eligible, transit_eligible, arrival_eligible, opening_hours, timezone, max_stay_minutes, amenities, adult_rules, child_rules, minimum_age, booking_window_hours, boarding_pass_required, cancellation_rules, voucher_required, provider_lounge_id) ON public.lounge_product_details TO anon, authenticated;

GRANT ALL ON public.service_products, public.esim_product_details, public.lounge_product_details TO service_role;

-- 2. Platform settings are Admin-only; storefront reads use public_platform_settings().
DROP POLICY IF EXISTS "platform settings public read" ON public.platform_settings;
REVOKE SELECT ON public.platform_settings FROM anon;

-- 3. Role lookup answers only for the caller (or the service role).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  select case
    when _user_id is not null and (_user_id = auth.uid() or coalesce(auth.role(), '') = 'service_role')
      then exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
    else false
  end
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 4. Public settings projection exposes only allowlisted keys.
CREATE OR REPLACE FUNCTION public.public_platform_settings(_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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

-- 5. Admin and role functions are never callable anonymously.
DO $h$
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
END $h$;

REVOKE ALL ON FUNCTION public.security_baseline_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_baseline_status() TO authenticated, service_role;

-- 6. Rate-limit counters and the signup trigger function are server/database only.
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
