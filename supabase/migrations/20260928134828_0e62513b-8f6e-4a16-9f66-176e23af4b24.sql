REVOKE SELECT ON public.service_products FROM anon, authenticated;
GRANT SELECT (id, service_type, slug, name, lifecycle, primary_provider_id, provider_external_id, provider_available, provider_synced_at, currency, sale_price, customer_visible, featured, badge, sort_order, margin_flagged, destination_id, airport_id, created_at, updated_at, is_test, source) ON public.service_products TO anon, authenticated;

REVOKE SELECT ON public.esim_product_details FROM anon, authenticated;
GRANT SELECT (product_id, country_id, country_iso, region_id, coverage_country_isos, package_kind, data_gb, unlimited_data, validity_days, provider_bundle_id, network_operators, supports_5g, supports_hotspot, data_only, activation_policy, validity_start_rule, apn_info, topup_supported, raw_validity_value, raw_validity_unit, data_type, fair_use_note, fair_use_policy, high_speed_allowance, speed_after_fair_use, coverage_subdivision_codes, unlimited_details_complete, metadata_provenance) ON public.esim_product_details TO anon, authenticated;

REVOKE SELECT ON public.lounge_product_details FROM anon, authenticated;
GRANT SELECT (product_id, airport_id, iata, terminal, lounge_name, airside, departure_eligible, transit_eligible, arrival_eligible, opening_hours, timezone, max_stay_minutes, amenities, adult_rules, child_rules, minimum_age, booking_window_hours, boarding_pass_required, cancellation_rules, voucher_required, provider_lounge_id) ON public.lounge_product_details TO anon, authenticated;

GRANT ALL ON public.service_products, public.esim_product_details, public.lounge_product_details TO service_role;

-- P1-3: server-side rate limit counters (service role only; no client access).
CREATE TABLE public.security_rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
GRANT ALL ON public.security_rate_limits TO service_role;
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(_bucket text, _limit integer, _window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start timestamptz; v_hits integer;
BEGIN
  v_start := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
  INSERT INTO public.security_rate_limits (bucket, window_start, hits) VALUES (_bucket, v_start, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = security_rate_limits.hits + 1
  RETURNING hits INTO v_hits;
  IF random() < 0.01 THEN
    DELETE FROM public.security_rate_limits WHERE window_start < now() - interval '2 days';
  END IF;
  RETURN v_hits <= _limit;
END $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;