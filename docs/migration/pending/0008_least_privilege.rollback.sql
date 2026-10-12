-- ROLLBACK for 0008 (DRAFT). Restores the exact pre-0008 privilege state captured from the live database on 12.10.2026.
-- Use only if 0008 breaks the live site. It re-opens the broad privileges; re-plan before re-applying 0008.
REVOKE ALL ON public.order_items, public.orders FROM authenticated;
GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.esim_product_details, public.lounge_product_details, public.platform_settings, public.service_products TO anon;
GRANT ALL ON public.admin_audit_log, public.admin_invitations, public.admin_notification_channels, public.airport_content, public.airports, public.analytics_events, public.campaigns, public.canonical_destinations, public.cms_documents, public.cms_translations, public.cms_versions, public.countries, public.customer_esims, public.customer_lounge_bookings, public.customer_notification_preferences, public.customer_trip_services, public.customer_trips, public.destination_content, public.destinations, public.esim_device_compatibility, public.esim_usage_settings, public.exchange_rates, public.feature_flags, public.guide_categories, public.guide_relations, public.guide_routes, public.guide_translations, public.guides, public.idempotency_keys, public.media_assets, public.ops_alerts, public.order_items, public.orders, public.payment_transactions, public.pricing_rules, public.product_translations, public.profiles, public.promotion_redemptions, public.promotions, public.provider_balance_monitor_settings, public.provider_balance_snapshots, public.provider_catalogue_changes, public.provider_connections, public.provider_price_history, public.provider_product_mappings, public.provider_raw_items, public.provider_sync_errors, public.provider_sync_runs, public.providers, public.provisioning_units, public.refund_request_events, public.refund_requests, public.regions, public.route_presets, public.security_rate_limits, public.seo_authors, public.services, public.theme_settings, public.traffic_attribution, public.travelers, public.user_roles, public.vignette_supplier_snapshots TO anon;
GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.esim_product_details, public.lounge_product_details, public.service_products TO authenticated;
GRANT SELECT, INSERT ON public.account_deletion_requests, public.email_template_versions, public.pdf_template_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.email_templates, public.pdf_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_template_translations, public.pdf_template_translations TO authenticated;
GRANT ALL ON public.admin_audit_log, public.admin_invitations, public.admin_notification_channels, public.airport_content, public.airports, public.analytics_events, public.campaigns, public.canonical_destinations, public.cms_documents, public.cms_translations, public.cms_versions, public.countries, public.customer_esims, public.customer_lounge_bookings, public.customer_notification_preferences, public.customer_trip_services, public.customer_trips, public.destination_content, public.destinations, public.esim_device_compatibility, public.esim_usage_settings, public.exchange_rates, public.feature_flags, public.guide_categories, public.guide_relations, public.guide_routes, public.guide_translations, public.guides, public.idempotency_keys, public.media_assets, public.ops_alerts, public.order_items, public.orders, public.payment_transactions, public.platform_settings, public.pricing_rules, public.product_translations, public.profiles, public.promotion_redemptions, public.promotions, public.provider_balance_monitor_settings, public.provider_balance_snapshots, public.provider_catalogue_changes, public.provider_connections, public.provider_price_history, public.provider_product_mappings, public.provider_raw_items, public.provider_sync_errors, public.provider_sync_runs, public.providers, public.provisioning_units, public.refund_request_events, public.refund_requests, public.regions, public.route_presets, public.security_rate_limits, public.seo_authors, public.services, public.theme_settings, public.traffic_attribution, public.travelers, public.user_roles, public.vignette_supplier_snapshots TO authenticated;
DROP TRIGGER IF EXISTS admin_audit_log_immutable ON public.admin_audit_log;
DROP TRIGGER IF EXISTS admin_audit_log_no_truncate ON public.admin_audit_log;
DROP TRIGGER IF EXISTS cms_versions_immutable ON public.cms_versions;
DROP TRIGGER IF EXISTS cms_versions_no_truncate ON public.cms_versions;
DROP TRIGGER IF EXISTS refund_request_events_no_truncate ON public.refund_request_events;
DROP FUNCTION IF EXISTS public.admin_audit_log_append_only();
DROP FUNCTION IF EXISTS public.cms_versions_append_only();
DROP POLICY IF EXISTS "cms versions admin read" ON public.cms_versions;
DROP POLICY IF EXISTS "cms versions admin append" ON public.cms_versions;
DROP POLICY IF EXISTS "cms versions admin" ON public.cms_versions;
CREATE POLICY "cms versions admin" ON public.cms_versions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
DO $$ BEGIN
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
EXCEPTION WHEN insufficient_privilege OR undefined_object THEN RAISE NOTICE 'supabase_admin defaults not restored: %', SQLERRM; END $$;

-- Restore the pre-0008 security_baseline_status (original body from the baseline schema).
CREATE OR REPLACE FUNCTION public.security_baseline_status() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.security_baseline_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_baseline_status() TO authenticated, service_role;
