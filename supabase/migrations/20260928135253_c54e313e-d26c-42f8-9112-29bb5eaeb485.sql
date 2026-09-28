ALTER TABLE public.esim_product_details
  ADD COLUMN supplier_groups jsonb GENERATED ALWAYS AS (provider_metadata -> 'groups') STORED,
  ADD COLUMN supplier_speed jsonb GENERATED ALWAYS AS (provider_metadata -> 'speed') STORED,
  ADD COLUMN supplier_countries jsonb GENERATED ALWAYS AS (provider_metadata -> 'countries') STORED;
GRANT SELECT (supplier_groups, supplier_speed, supplier_countries) ON public.esim_product_details TO anon, authenticated;