ALTER TABLE public.esim_product_details
  ADD COLUMN IF NOT EXISTS raw_validity_value numeric,
  ADD COLUMN IF NOT EXISTS raw_validity_unit text,
  ADD COLUMN IF NOT EXISTS data_type text NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS fair_use_note text;

UPDATE public.esim_product_details
SET raw_validity_value = COALESCE(raw_validity_value, validity_days),
    raw_validity_unit = COALESCE(raw_validity_unit, CASE WHEN validity_days IS NULL THEN NULL ELSE 'DAYS' END),
    data_type = CASE WHEN unlimited_data THEN 'UNLIMITED' ELSE 'FIXED' END;

ALTER TABLE public.esim_product_details
  DROP CONSTRAINT IF EXISTS esim_product_details_data_type_check,
  ADD CONSTRAINT esim_product_details_data_type_check CHECK (data_type IN ('FIXED', 'UNLIMITED'));

ALTER TABLE public.esim_product_details
  DROP CONSTRAINT IF EXISTS esim_product_details_activation_policy_check,
  ADD CONSTRAINT esim_product_details_activation_policy_check
  CHECK (activation_policy IS NULL OR activation_policy IN ('ON_INSTALL','ON_FIRST_NETWORK_CONNECTION','ON_PURCHASE','UNKNOWN'));