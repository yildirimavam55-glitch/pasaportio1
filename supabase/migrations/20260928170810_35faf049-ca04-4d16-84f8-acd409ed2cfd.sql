-- OWNER APPROVED (Security Phase 2.1): deterministic status for items #1 and #2
CREATE OR REPLACE FUNCTION public.security_baseline_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  protected text[] := ARRAY['profiles','orders','order_items','customer_esims','refund_requests','refund_request_events','payment_transactions','travelers','user_roles','provisioning_units','customer_trips','customer_lounge_bookings','admin_audit_log','provider_connections','security_rate_limits'];
  v_rls_off int; v_cost_exposed boolean; v_role_write boolean; v_rl boolean; v_esim_anon boolean;
  v_role_lookup boolean; v_settings_private boolean;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.'; END IF;
  SELECT count(*) INTO v_rls_off FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY(protected) AND NOT c.relrowsecurity;
  v_cost_exposed := has_column_privilege('anon','public.service_products','provider_cost','SELECT')
    OR has_column_privilege('authenticated','public.service_products','provider_cost','SELECT')
    OR has_column_privilege('anon','public.esim_product_details','provider_metadata','SELECT')
    OR has_column_privilege('authenticated','public.esim_product_details','provider_metadata','SELECT');
  v_role_write := EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles'
    AND cmd IN ('INSERT','UPDATE','ALL','DELETE') AND coalesce(qual,'') NOT ILIKE '%is_admin%' AND coalesce(with_check,'') NOT ILIKE '%is_admin%');
  v_rl := to_regprocedure('public.consume_rate_limit(text,integer,integer)') IS NOT NULL
    AND NOT has_function_privilege('anon','public.consume_rate_limit(text,integer,integer)','EXECUTE')
    AND NOT has_function_privilege('authenticated','public.consume_rate_limit(text,integer,integer)','EXECUTE');
  v_esim_anon := EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customer_esims' AND 'anon' = ANY(roles));
  v_role_lookup := NOT has_function_privilege('anon','public.has_role(uuid,public.app_role)','EXECUTE')
    AND (SELECT prosrc FROM pg_proc WHERE oid = 'public.has_role(uuid,public.app_role)'::regprocedure) ILIKE '%_user_id = auth.uid()%';
  v_settings_private := NOT has_table_privilege('anon','public.platform_settings','SELECT')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_settings'
      AND cmd IN ('SELECT','ALL') AND coalesce(qual,'') NOT ILIKE '%is_admin%');
  RETURN jsonb_build_object(
    'databaseProtection', v_rls_off = 0,
    'customerIsolation', v_rls_off = 0 AND NOT v_esim_anon,
    'supplierCostProtection', NOT v_cost_exposed,
    'roleProtection', NOT v_role_write,
    'rateLimiting', v_rl,
    'roleLookupSelfOnly', v_role_lookup,
    'settingsTablePrivate', v_settings_private,
    'checkedAt', now());
END $function$;