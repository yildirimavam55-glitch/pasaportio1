-- ROLLBACK for 0009 (DRAFT). Restores the pre-0009 policy, function mode and column grant.
-- Revert 0009_app_patch.diff at the same time (or keep it: the patched code also works on the old state).
DROP POLICY IF EXISTS "products public read" ON public.service_products;
CREATE POLICY "products public read" ON public.service_products FOR SELECT TO authenticated, anon
  USING (lifecycle = 'PUBLISHED'::public.product_lifecycle AND customer_visible = true);
ALTER FUNCTION public.storefront_country_starting_prices(text[], boolean) SECURITY INVOKER;
ALTER FUNCTION public.storefront_regional_package_rows(boolean) SECURITY INVOKER;
GRANT SELECT (margin_flagged) ON public.service_products TO anon, authenticated;
