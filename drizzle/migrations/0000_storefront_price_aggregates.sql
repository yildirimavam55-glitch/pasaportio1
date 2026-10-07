-- Phase 2: storefront "from" prices and regional card inputs computed in the database.
-- SECURITY INVOKER: callers keep their own RLS/column grants; only public storefront columns are read.

CREATE OR REPLACE FUNCTION public.esim_plan_tier(_groups jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _groups IS NULL OR jsonb_typeof(_groups) <> 'array' THEN NULL
    ELSE (
      SELECT CASE
        WHEN t NOT LIKE '%unlimited%' THEN NULL
        WHEN t LIKE '%plus%' THEN 'PLUS'
        WHEN t LIKE '%essential%' THEN 'ESSENTIAL'
        WHEN t LIKE '%lite%' THEN 'LITE'
        ELSE NULL END
      FROM (SELECT lower(coalesce(string_agg(e, ' '), '')) AS t FROM jsonb_array_elements_text(_groups) e) s
    ) END
$$;

-- Lowest live single-country selling price per country (same rules as the storefront).
CREATE OR REPLACE FUNCTION public.storefront_country_starting_prices(_isos text[] DEFAULT NULL, _show_test boolean DEFAULT false)
RETURNS TABLE(iso text, amount numeric, currency text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT DISTINCT ON (upper(d.country_iso)) upper(d.country_iso), p.sale_price, coalesce(p.currency, 'EUR')
  FROM public.service_products p
  JOIN public.esim_product_details d ON d.product_id = p.id
  WHERE p.service_type = 'ESIM' AND p.lifecycle = 'PUBLISHED' AND p.customer_visible
    AND p.provider_available AND p.margin_flagged = false AND p.sale_price > 0
    AND (_show_test OR p.is_test IS NOT TRUE)
    AND d.package_kind = 'COUNTRY'
    AND upper(d.country_iso) ~ '^[A-Z]{2}$'
    AND (_isos IS NULL OR d.country_iso = ANY(_isos))
    AND NOT (coalesce(d.unlimited_data, false) AND coalesce(public.esim_plan_tier(d.supplier_groups), '') IN ('LITE','PLUS'))
  ORDER BY upper(d.country_iso), p.sale_price, p.id
$$;

-- Slim multi-country rows for regional cards; Lite/Plus removed where an Essential exists for the same structure.
CREATE OR REPLACE FUNCTION public.storefront_regional_package_rows(_show_test boolean DEFAULT false)
RETURNS TABLE(sale_price numeric, currency text, country_iso text, package_kind text, unlimited boolean,
  data_gb numeric, validity_days integer, coverage text[], network_operators text[], supplier_speed jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH base AS (
    SELECT p.id, p.sort_order, p.sale_price, coalesce(p.currency, 'EUR') AS currency,
      upper(d.country_iso) AS country_iso, d.package_kind,
      (d.data_type = 'UNLIMITED' OR coalesce(d.unlimited_data, false)) AS unlimited,
      d.data_gb, d.validity_days, d.network_operators, d.supplier_speed,
      CASE WHEN (d.data_type = 'UNLIMITED' OR coalesce(d.unlimited_data, false)) THEN public.esim_plan_tier(d.supplier_groups) END AS tier,
      ARRAY(SELECT DISTINCT upper(x) FROM unnest(coalesce(d.coverage_country_isos, '{}') || CASE WHEN d.country_iso IS NULL THEN '{}'::text[] ELSE ARRAY[d.country_iso] END) x ORDER BY 1) AS coverage
    FROM public.service_products p
    JOIN public.esim_product_details d ON d.product_id = p.id
    WHERE p.service_type = 'ESIM' AND p.lifecycle = 'PUBLISHED' AND p.customer_visible
      AND p.provider_available AND p.margin_flagged = false AND p.sale_price > 0
      AND (_show_test OR p.is_test IS NOT TRUE)
      AND upper(coalesce(d.package_kind, '')) NOT IN ('COUNTRY','LOCAL','SUBDIVISION','STATE','PROVINCE')
  ), multi AS (SELECT * FROM base WHERE cardinality(coverage) >= 2)
  SELECT m.sale_price, m.currency, m.country_iso, m.package_kind, m.unlimited, m.data_gb, m.validity_days,
    m.coverage, m.network_operators, m.supplier_speed
  FROM multi m
  WHERE NOT (m.unlimited AND coalesce(m.tier, '') <> 'ESSENTIAL' AND EXISTS (
    SELECT 1 FROM multi e WHERE e.unlimited AND e.tier = 'ESSENTIAL'
      AND e.coverage = m.coverage AND e.validity_days IS NOT DISTINCT FROM m.validity_days))
  ORDER BY m.sort_order, m.id
$$;

GRANT EXECUTE ON FUNCTION public.esim_plan_tier(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storefront_country_starting_prices(text[], boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storefront_regional_package_rows(boolean) TO anon, authenticated, service_role;