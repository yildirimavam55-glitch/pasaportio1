-- 0009 hide service_products.margin_flagged from browser roles — DRAFT, NOT APPLIED.
-- margin_flagged is an internal Admin pricing-review flag ("margin below minimum"). Public code only
-- used it as a hide filter. That filter moves into the public read policy, so browser roles never
-- need to read the column. MUST ship together with 0009_app_patch.diff (public queries stop
-- filtering on the column); applying the SQL without the patch breaks catalogue queries.
-- Apply only after 0008. Idempotent. No rows changed.

-- 1. Public read policy hides flagged products (same rows the storefront lists already showed).
DROP POLICY IF EXISTS "products public read" ON public.service_products;
CREATE POLICY "products public read" ON public.service_products FOR SELECT TO authenticated, anon
  USING (lifecycle = 'PUBLISHED'::public.product_lifecycle AND customer_visible = true AND margin_flagged = false);

-- 2. The two storefront price functions filter on margin_flagged internally. They run as owner so the
--    filter keeps working without a browser column grant; their WHERE clauses already restrict to
--    published, visible, available, non-flagged products, and they return only public fields.
ALTER FUNCTION public.storefront_country_starting_prices(text[], boolean) SECURITY DEFINER;
ALTER FUNCTION public.storefront_regional_package_rows(boolean) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.storefront_country_starting_prices(text[], boolean), public.storefront_regional_package_rows(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_country_starting_prices(text[], boolean), public.storefront_regional_package_rows(boolean) TO anon, authenticated, service_role;

-- 3. Column grant without margin_flagged (all other public columns unchanged).
REVOKE SELECT ON public.service_products FROM anon, authenticated;
GRANT SELECT (id, service_type, slug, name, lifecycle, primary_provider_id, provider_external_id, provider_available,
  provider_synced_at, currency, sale_price, customer_visible, featured, badge, sort_order, destination_id, airport_id,
  created_at, updated_at, is_test, source) ON public.service_products TO anon, authenticated;

DO $$
BEGIN
  IF has_column_privilege('anon','public.service_products','margin_flagged','SELECT')
     OR has_column_privilege('authenticated','public.service_products','margin_flagged','SELECT') THEN
    RAISE EXCEPTION '0009 FAIL: margin_flagged still readable by browser roles';
  END IF;
END $$;
