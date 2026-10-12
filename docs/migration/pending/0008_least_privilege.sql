-- 0008 least-privilege — DRAFT, NOT APPLIED TO THE LIVE DATABASE.
-- Approved for preparation + isolated testing only (12.10.2026). Live apply needs separate owner approval.
--
-- Principle: a browser role (anon / authenticated) keeps exactly the table privileges that an
-- existing RLS policy can use; everything else is revoked. TRUNCATE / REFERENCES / TRIGGER are
-- never granted to browser roles. service_role keeps ALL (server code, RLS bypass by design).
-- Supplier cost / payment fee columns are hidden from customers with column-level SELECT.
-- No rows are inserted, updated or deleted. Every statement is idempotent (safe to re-run).

-- ---------------------------------------------------------------------------
-- A. Remove all table privileges of browser roles (except the 3 column-ACL catalogue tables)
-- ---------------------------------------------------------------------------
REVOKE ALL ON
  public.account_deletion_requests, public.admin_audit_log, public.admin_invitations, public.admin_notification_channels,
  public.airport_content, public.airports, public.analytics_events, public.campaigns, public.canonical_destinations,
  public.cms_documents, public.cms_translations, public.cms_versions, public.countries, public.customer_esims,
  public.customer_lounge_bookings, public.customer_notification_preferences, public.customer_trip_services,
  public.customer_trips, public.destination_content, public.destinations, public.email_template_translations,
  public.email_template_versions, public.email_templates, public.esim_device_compatibility, public.esim_usage_settings,
  public.exchange_rates, public.feature_flags, public.guide_categories, public.guide_relations, public.guide_routes,
  public.guide_translations, public.guides, public.idempotency_keys, public.media_assets, public.ops_alerts,
  public.order_items, public.orders, public.payment_transactions, public.pdf_template_translations,
  public.pdf_template_versions, public.pdf_templates, public.platform_settings, public.pricing_rules,
  public.product_translations, public.profiles, public.promotion_redemptions, public.promotions,
  public.provider_balance_monitor_settings, public.provider_balance_snapshots, public.provider_catalogue_changes,
  public.provider_connections, public.provider_price_history, public.provider_product_mappings, public.provider_raw_items,
  public.provider_sync_errors, public.provider_sync_runs, public.providers, public.provisioning_units,
  public.refund_request_events, public.refund_requests, public.regions, public.route_presets, public.security_rate_limits,
  public.seo_authors, public.services, public.theme_settings, public.traffic_attribution, public.travelers,
  public.user_roles, public.vignette_supplier_snapshots
FROM anon, authenticated;

-- Column-ACL tables: keep the existing column-level SELECT grants (they hide supplier cost);
-- remove only table-level privileges no policy can use.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON
  public.service_products, public.esim_product_details, public.lounge_product_details FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON
  public.service_products, public.esim_product_details, public.lounge_product_details FROM authenticated;

-- ---------------------------------------------------------------------------
-- B. anon: SELECT only where a public read policy exists
-- ---------------------------------------------------------------------------
GRANT SELECT ON
  public.airport_content, public.airports, public.campaigns, public.canonical_destinations, public.cms_documents,
  public.cms_translations, public.countries, public.destination_content, public.destinations,
  public.esim_device_compatibility, public.esim_usage_settings, public.exchange_rates, public.feature_flags,
  public.guide_categories, public.guide_relations, public.guide_routes, public.guide_translations, public.guides,
  public.media_assets, public.product_translations, public.regions, public.route_presets, public.seo_authors,
  public.services, public.theme_settings
TO anon;

-- ---------------------------------------------------------------------------
-- C. authenticated: privileges matching existing policies (RLS still decides which rows)
-- ---------------------------------------------------------------------------
-- Admin-managed tables with FOR ALL policies (is_admin) + public read tables
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.airport_content, public.airports, public.campaigns, public.canonical_destinations, public.cms_documents,
  public.cms_translations, public.countries, public.destination_content, public.destinations,
  public.exchange_rates, public.feature_flags, public.guide_categories, public.guide_relations, public.guide_routes,
  public.guide_translations, public.guides, public.media_assets, public.ops_alerts, public.platform_settings,
  public.pricing_rules, public.product_translations, public.provider_catalogue_changes, public.provider_connections,
  public.provider_price_history, public.provider_product_mappings, public.provider_raw_items, public.provider_sync_errors,
  public.provider_sync_runs, public.providers, public.regions, public.route_presets, public.seo_authors, public.services,
  public.theme_settings, public.email_template_translations, public.pdf_template_translations
TO authenticated;
-- Customer-owned (own-row policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_trips, public.travelers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON
  public.profiles, public.customer_notification_preferences, public.esim_device_compatibility,
  public.esim_usage_settings, public.promotions, public.email_templates, public.pdf_templates
TO authenticated;
GRANT SELECT, INSERT ON
  public.account_deletion_requests, public.customer_trip_services, public.refund_request_events,
  public.vignette_supplier_snapshots, public.email_template_versions, public.pdf_template_versions, public.cms_versions
TO authenticated;
GRANT SELECT, UPDATE ON public.refund_requests TO authenticated;
GRANT SELECT ON
  public.admin_audit_log, public.admin_invitations, public.admin_notification_channels, public.analytics_events,
  public.customer_esims, public.customer_lounge_bookings, public.payment_transactions, public.promotion_redemptions,
  public.provider_balance_monitor_settings, public.provider_balance_snapshots, public.provisioning_units,
  public.traffic_attribution, public.user_roles
TO authenticated;
-- Customers read their own orders and order lines, but never supplier cost or payment fee.
-- guest_claim_token and idempotency_key are server-only (service_role) technical fields: no
-- browser query reads them, so they are not granted (final hardening, 12.10.2026).
GRANT SELECT (id, order_id, service_type, product_id, provider_id, traveler_id, product_name_snapshot,
  product_slug_snapshot, sale_price, discount, currency, quantity, destination_snapshot, airport_iata_snapshot,
  fulfillment_status, provider_reference, details_snapshot, created_at) ON public.order_items TO authenticated;
GRANT SELECT (id, order_number, customer_id, guest_email, trip_id, status, payment_status,
  fulfillment_status, currency, gross_revenue, discount_total, tax_total, refunded_total, fx_rate_to_eur, locale,
  customer_country_iso, created_at, updated_at, promotion_id, coupon_code, discount_type,
  discount_value, original_subtotal, final_subtotal) ON public.orders TO authenticated;

-- service_role: unchanged (ALL); stated explicitly so a fresh server ends in the same state.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ---------------------------------------------------------------------------
-- D. Default privileges: new tables / sequences / functions start closed for browser roles
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, PUBLIC;
-- Function EXECUTE for PUBLIC is a global default; a per-schema rule cannot remove it.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
-- supabase_admin: on managed hosting the migration role (postgres, not superuser, not a member of
-- supabase_admin) is NOT allowed to change these defaults. This is reported as a WARNING, never as
-- success. Section G fails the migration if any app object is owned by another role, so the open
-- supabase_admin defaults cannot affect application tables. Close them as superuser on the new server.
DO $$
BEGIN
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, PUBLIC;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
  RAISE NOTICE '0008: supabase_admin default privileges closed.';
EXCEPTION WHEN insufficient_privilege OR undefined_object THEN
  RAISE WARNING '0008 NOT APPLIED: supabase_admin default privileges unchanged (%). Status: FAIL until closed by a superuser.', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- E. Append-only audit log and CMS versions
-- ---------------------------------------------------------------------------
-- Allowed only: the FK cascade "admin user deleted -> admin_user_id/created_by SET NULL", and
-- removal of CMS versions when their parent document is deleted (ON DELETE CASCADE).
CREATE OR REPLACE FUNCTION public.admin_audit_log_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND pg_trigger_depth() > 1
     AND OLD.admin_user_id IS NOT NULL AND NEW.admin_user_id IS NULL
     AND (to_jsonb(NEW) - 'admin_user_id') = (to_jsonb(OLD) - 'admin_user_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Yonetim kayitlari degistirilemez veya silinemez.';
END $$;

CREATE OR REPLACE FUNCTION public.cms_versions_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND pg_trigger_depth() > 1
     AND OLD.created_by IS NOT NULL AND NEW.created_by IS NULL
     AND (to_jsonb(NEW) - 'created_by') = (to_jsonb(OLD) - 'created_by') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1
     AND NOT EXISTS (SELECT 1 FROM public.cms_documents d WHERE d.id = OLD.document_id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'CMS surumleri degistirilemez veya silinemez.';
END $$;

REVOKE ALL ON FUNCTION public.admin_audit_log_append_only(), public.cms_versions_append_only() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS admin_audit_log_immutable ON public.admin_audit_log;
DROP TRIGGER IF EXISTS admin_audit_log_no_truncate ON public.admin_audit_log;
CREATE TRIGGER admin_audit_log_immutable BEFORE UPDATE OR DELETE ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION public.admin_audit_log_append_only();
CREATE TRIGGER admin_audit_log_no_truncate BEFORE TRUNCATE ON public.admin_audit_log FOR EACH STATEMENT EXECUTE FUNCTION public.admin_audit_log_append_only();

DROP TRIGGER IF EXISTS cms_versions_immutable ON public.cms_versions;
DROP TRIGGER IF EXISTS cms_versions_no_truncate ON public.cms_versions;
CREATE TRIGGER cms_versions_immutable BEFORE UPDATE OR DELETE ON public.cms_versions FOR EACH ROW EXECUTE FUNCTION public.cms_versions_append_only();
CREATE TRIGGER cms_versions_no_truncate BEFORE TRUNCATE ON public.cms_versions FOR EACH STATEMENT EXECUTE FUNCTION public.cms_versions_append_only();

-- Other append-only histories also get TRUNCATE protection.
DROP TRIGGER IF EXISTS refund_request_events_no_truncate ON public.refund_request_events;
CREATE TRIGGER refund_request_events_no_truncate BEFORE TRUNCATE ON public.refund_request_events FOR EACH STATEMENT EXECUTE FUNCTION public.refund_events_append_only();

-- cms_versions policy: admins read + append only (was FOR ALL).
DROP POLICY IF EXISTS "cms versions admin" ON public.cms_versions;
DROP POLICY IF EXISTS "cms versions admin read" ON public.cms_versions;
DROP POLICY IF EXISTS "cms versions admin append" ON public.cms_versions;
CREATE POLICY "cms versions admin read" ON public.cms_versions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "cms versions admin append" ON public.cms_versions FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- SECURITY DEFINER functions: EXECUTE grants are intentionally left unchanged.
