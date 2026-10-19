-- Safe staging catalogue. No real customers, orders, emails or supplier secrets.
-- Apply only after 0001_hardened_schema.sql and only on an empty/test database.
-- is_test products stay hidden unless showTestCatalogue is on.

INSERT INTO public.services (service_type, slug, enabled, customer_visible, sort_order)
VALUES
  ('ESIM', 'esim', true, true, 10),
  ('LOUNGE', 'lounge', false, false, 20)
ON CONFLICT (service_type) DO UPDATE
SET enabled = EXCLUDED.enabled, customer_visible = EXCLUDED.customer_visible;

INSERT INTO public.regions (id, code, name)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'EU', 'Europe'),
  ('11111111-1111-4111-8111-111111111112', 'AS', 'Asia')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.countries (id, iso2, iso3, name, region_id)
VALUES
  ('22222222-2222-4222-8222-222222222221', 'TR', 'TUR', 'Türkiye', '11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222', 'DE', 'DEU', 'Germany', '11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222223', 'JP', 'JPN', 'Japan', '11111111-1111-4111-8111-111111111112')
ON CONFLICT (iso2) DO NOTHING;

INSERT INTO public.destinations (id, slug, name, kind, country_id, region_id)
VALUES
  ('33333333-3333-4333-8333-333333333331', 'turkiye', 'Türkiye', 'COUNTRY', '22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111'),
  ('33333333-3333-4333-8333-333333333332', 'germany', 'Germany', 'COUNTRY', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'),
  ('33333333-3333-4333-8333-333333333333', 'japan', 'Japan', 'COUNTRY', '22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111112')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('storefront.esim', true, 'Staging storefront'),
  ('checkout.esim', true, 'Staging checkout (live supplier still off in env)'),
  ('commerce.test_payments', true, 'Admin-only test payment path'),
  ('showTestCatalogue', true, 'Show is_test packages on staging'),
  ('provider.sync', false, 'Do not pull or buy from eSIM Go')
ON CONFLICT (key) DO UPDATE
SET enabled = EXCLUDED.enabled, description = EXCLUDED.description;

INSERT INTO public.providers (
  id, code, name, service_type, active, adapter_type, auto_sync, notes
) VALUES (
  '44444444-4444-4444-8444-444444444444',
  'STAGING_MOCK',
  'Staging mock (no live supplier)',
  'ESIM',
  false,
  'GENERIC_REST',
  false,
  'No API credentials. Live purchases stay disabled by COMMERCE_LIVE_PROVISIONING.'
) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.service_products (
  id, service_type, slug, name, lifecycle, primary_provider_id, provider_external_id,
  provider_cost, provider_currency, provider_available, currency, sale_price,
  customer_visible, featured, sort_order, destination_id, is_test, source
) VALUES
  ('55555555-5555-4555-8555-555555555551', 'ESIM', 'test-tr-5gb-7d', 'Test Türkiye 5 GB / 7 days',
    'PUBLISHED', '44444444-4444-4444-8444-444444444444', 'staging-tr-5-7',
    2.10, 'EUR', true, 'EUR', 4.90, true, true, 10,
    '33333333-3333-4333-8333-333333333331', true, 'INTERNAL_TEST'),
  ('55555555-5555-4555-8555-555555555552', 'ESIM', 'test-de-10gb-15d', 'Test Germany 10 GB / 15 days',
    'PUBLISHED', '44444444-4444-4444-8444-444444444444', 'staging-de-10-15',
    3.40, 'EUR', true, 'EUR', 7.90, true, false, 20,
    '33333333-3333-4333-8333-333333333332', true, 'INTERNAL_TEST'),
  ('55555555-5555-4555-8555-555555555553', 'ESIM', 'test-jp-3gb-7d', 'Test Japan 3 GB / 7 days',
    'PUBLISHED', '44444444-4444-4444-8444-444444444444', 'staging-jp-3-7',
    2.80, 'EUR', true, 'EUR', 6.50, true, false, 30,
    '33333333-3333-4333-8333-333333333333', true, 'INTERNAL_TEST')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.esim_product_details (
  product_id, country_id, country_iso, coverage_country_isos, package_kind,
  data_gb, unlimited_data, validity_days, data_type
) VALUES
  ('55555555-5555-4555-8555-555555555551', '22222222-2222-4222-8222-222222222221', 'TR', ARRAY['TR'], 'COUNTRY', 5, false, 7, 'FIXED'),
  ('55555555-5555-4555-8555-555555555552', '22222222-2222-4222-8222-222222222222', 'DE', ARRAY['DE'], 'COUNTRY', 10, false, 15, 'FIXED'),
  ('55555555-5555-4555-8555-555555555553', '22222222-2222-4222-8222-222222222223', 'JP', ARRAY['JP'], 'COUNTRY', 3, false, 7, 'FIXED')
ON CONFLICT (product_id) DO NOTHING;
