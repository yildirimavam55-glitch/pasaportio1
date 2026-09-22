ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'CATALOGUE_DROP_BLOCKED';

INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('esim_auto_publish', false, 'Senkronizasyon sonunda uygun ürünleri otomatik yayınla. Kapalıyken yeni ürünler DRAFT kalir.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.pricing_rules (name, service_type, strategy, markup_percent, minimum_margin_percent, rounding_mode, currency, priority, active)
SELECT 'Varsayılan eSIM fiyat kuralı', 'ESIM'::service_type, 'MARKUP_PERCENT'::pricing_strategy, 35, NULL, 'NEAREST_99', 'EUR', 1000, true
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_rules WHERE service_type = 'ESIM'::service_type AND provider_id IS NULL AND active);

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS max_catalogue_drop_percent numeric NOT NULL DEFAULT 20;

ALTER TABLE public.provider_sync_runs
  ADD COLUMN IF NOT EXISTS previous_item_count integer,
  ADD COLUMN IF NOT EXISTS drop_percent numeric,
  ADD COLUMN IF NOT EXISTS deactivation_blocked boolean NOT NULL DEFAULT false;

ALTER TABLE public.service_products
  ADD COLUMN IF NOT EXISTS pricing_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priced_at timestamptz,
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;