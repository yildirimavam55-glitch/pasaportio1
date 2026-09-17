-- 1. Test/production separation on the existing product layer
alter table public.service_products
  add column if not exists is_test boolean not null default false,
  add column if not exists source text not null default 'PROVIDER';

create index if not exists service_products_is_test_idx on public.service_products (is_test);
create index if not exists service_products_source_idx on public.service_products (source);

-- 2. Storefront kill switch for the test catalogue
insert into public.feature_flags (key, enabled, description, payload)
values ('showTestCatalogue', true, 'Shows INTERNAL_TEST catalogue products in the public storefront. Must be OFF before production launch.', '{}'::jsonb)
on conflict (key) do nothing;

-- 3. Reset any previous internal test catalogue (never touches provider data)
delete from public.esim_product_details d
  using public.service_products p
  where d.product_id = p.id and p.source = 'INTERNAL_TEST';
delete from public.lounge_product_details d
  using public.service_products p
  where d.product_id = p.id and p.source = 'INTERNAL_TEST';
delete from public.service_products where source = 'INTERNAL_TEST';

-- 4. eSIM test products
insert into public.service_products
  (service_type, slug, name, lifecycle, customer_visible, provider_available, currency, sale_price, provider_cost, badge, sort_order, is_test, source, provider_external_id)
values
  ('ESIM', 'test-tr-3gb-7d',   'Türkiye 3 GB · 7 gün (TEST)',   'PUBLISHED', true, true, 'EUR',  4.99, 3.20, null,       10, true, 'INTERNAL_TEST', 'TR-3GB-7D-TEST'),
  ('ESIM', 'test-tr-5gb-15d',  'Türkiye 5 GB · 15 gün (TEST)',  'PUBLISHED', true, true, 'EUR',  6.99, 4.40, 'Önerilen', 11, true, 'INTERNAL_TEST', 'TR-5GB-15D-TEST'),
  ('ESIM', 'test-tr-10gb-30d', 'Türkiye 10 GB · 30 gün (TEST)', 'PUBLISHED', true, true, 'EUR', 10.99, 7.10, null,       12, true, 'INTERNAL_TEST', 'TR-10GB-30D-TEST'),
  ('ESIM', 'test-de-3gb-7d',   'Almanya 3 GB · 7 gün (TEST)',   'PUBLISHED', true, true, 'EUR',  4.49, 2.90, null,       20, true, 'INTERNAL_TEST', 'DE-3GB-7D-TEST'),
  ('ESIM', 'test-de-5gb-15d',  'Almanya 5 GB · 15 gün (TEST)',  'PUBLISHED', true, true, 'EUR',  6.49, 4.10, null,       21, true, 'INTERNAL_TEST', 'DE-5GB-15D-TEST'),
  ('ESIM', 'test-de-10gb-30d', 'Almanya 10 GB · 30 gün (TEST)', 'PUBLISHED', true, true, 'EUR', 10.49, 6.80, null,       22, true, 'INTERNAL_TEST', 'DE-10GB-30D-TEST'),
  ('ESIM', 'test-eu-5gb-15d',  'Avrupa 5 GB · 15 gün (TEST)',   'PUBLISHED', true, true, 'EUR',  8.99, 5.60, null,       30, true, 'INTERNAL_TEST', 'EU-5GB-15D-TEST'),
  ('ESIM', 'test-eu-10gb-30d', 'Avrupa 10 GB · 30 gün (TEST)',  'PUBLISHED', true, true, 'EUR', 13.99, 8.90, null,       31, true, 'INTERNAL_TEST', 'EU-10GB-30D-TEST'),
  ('ESIM', 'test-eu-20gb-30d', 'Avrupa 20 GB · 30 gün (TEST)',  'PUBLISHED', true, true, 'EUR', 19.99, 12.80, 'Popüler', 32, true, 'INTERNAL_TEST', 'EU-20GB-30D-TEST'),
  ('ESIM', 'test-global-10gb-30d', 'Global 10 GB · 30 gün (TEST)', 'PUBLISHED', true, true, 'EUR', 24.99, 16.50, null,   40, true, 'INTERNAL_TEST', 'GLOBAL-10GB-30D-TEST');

insert into public.esim_product_details
  (product_id, package_kind, country_iso, coverage_country_isos, data_gb, unlimited_data, validity_days, supports_5g, supports_hotspot, data_only, topup_supported, network_operators, provider_bundle_id)
select p.id,
  case p.provider_external_id
    when 'GLOBAL-10GB-30D-TEST' then 'GLOBAL'
    else case when p.provider_external_id like 'EU-%' then 'REGIONAL' else 'COUNTRY' end
  end,
  case when p.provider_external_id like 'TR-%' then 'TR' when p.provider_external_id like 'DE-%' then 'DE' else null end,
  case
    when p.provider_external_id like 'TR-%' then array['TR']
    when p.provider_external_id like 'DE-%' then array['DE']
    when p.provider_external_id like 'EU-%' then array['DE','AT','SI','HR','RS','BG','FR','IT','ES','NL','BE','GR']
    else array['TR','DE','AT','SI','HR','RS','BG','FR','IT','ES','US','JP']
  end,
  (regexp_replace(p.provider_external_id, '^[A-Z]+-(\d+)GB-.*$', '\1'))::numeric,
  false,
  (regexp_replace(p.provider_external_id, '^.*-(\d+)D-TEST$', '\1'))::int,
  true, true, true, false,
  array['TEST-NET'],
  p.provider_external_id
from public.service_products p
where p.source = 'INTERNAL_TEST' and p.service_type = 'ESIM';

-- 5. Lounge test products (clearly fictional demo inventory)
insert into public.service_products
  (service_type, slug, name, lifecycle, customer_visible, provider_available, currency, sale_price, provider_cost, sort_order, is_test, source, provider_external_id)
values
  ('LOUNGE', 'test-ist-premium', 'İstanbul Travel Lounge — Demo',  'PUBLISHED', true, true, 'EUR', 29.90, 19.90, 10, true, 'INTERNAL_TEST', 'IST-PREMIUM-TEST'),
  ('LOUNGE', 'test-fra-comfort', 'Frankfurt Comfort Lounge — Demo','PUBLISHED', true, true, 'EUR', 27.90, 18.50, 11, true, 'INTERNAL_TEST', 'FRA-COMFORT-TEST'),
  ('LOUNGE', 'test-dus-travel',  'Düsseldorf Travel Lounge — Demo','PUBLISHED', true, true, 'EUR', 24.90, 16.50, 12, true, 'INTERNAL_TEST', 'DUS-TRAVEL-TEST');

insert into public.lounge_product_details
  (product_id, iata, terminal, lounge_name, airside, departure_eligible, transit_eligible, arrival_eligible, max_stay_minutes, amenities, boarding_pass_required, voucher_required, provider_lounge_id)
select p.id,
  case p.provider_external_id when 'IST-PREMIUM-TEST' then 'IST' when 'FRA-COMFORT-TEST' then 'FRA' else 'DUS' end,
  case p.provider_external_id when 'IST-PREMIUM-TEST' then 'International' when 'FRA-COMFORT-TEST' then 'Terminal 1' else null end,
  p.name,
  true,
  true,
  p.provider_external_id <> 'DUS-TRAVEL-TEST',
  false,
  case p.provider_external_id when 'DUS-TRAVEL-TEST' then 120 else 180 end,
  case p.provider_external_id
    when 'DUS-TRAVEL-TEST' then array['WIFI','SNACKS','DRINKS','CHARGING']
    when 'FRA-COMFORT-TEST' then array['WIFI','FOOD','DRINKS','CHARGING']
    else array['WIFI','FOOD','DRINKS','CHARGING','QUIET']
  end,
  true, true,
  p.provider_external_id
from public.service_products p
where p.source = 'INTERNAL_TEST' and p.service_type = 'LOUNGE';