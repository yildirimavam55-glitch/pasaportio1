-- Phase 2A: multi-provider hub, sync automation, price history and change feed.

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS adapter_type text NOT NULL DEFAULT 'GENERIC_REST',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS minimum_margin_percent numeric(6,2),
  ADD COLUMN IF NOT EXISTS auto_sync boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sync_interval_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS low_balance_threshold numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance_currency text,
  ADD COLUMN IF NOT EXISTS balance_checked_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'providers_adapter_type_check') THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT providers_adapter_type_check
      CHECK (adapter_type IN ('NATIVE_ESIM_GO', 'GENERIC_REST', 'CUSTOM'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'providers_sync_interval_check') THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT providers_sync_interval_check
      CHECK (sync_interval_hours IN (6, 12, 24, 48));
  END IF;
END
$$;

ALTER TABLE public.provider_connections
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_state text NOT NULL DEFAULT 'IDLE';

ALTER TABLE public.provider_sync_runs
  ADD COLUMN IF NOT EXISTS items_returned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_changes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coverage_changes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS complete boolean NOT NULL DEFAULT false;

-- Provider cost history: never overwrite a cost without keeping the previous value.
CREATE TABLE IF NOT EXISTS public.provider_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.service_products(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  old_cost numeric(12,4),
  new_cost numeric(12,4) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  change_amount numeric(12,4),
  change_percent numeric(8,2),
  sync_run_id uuid REFERENCES public.provider_sync_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_price_history_provider_idx ON public.provider_price_history (provider_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_price_history TO authenticated;
GRANT ALL ON public.provider_price_history TO service_role;
ALTER TABLE public.provider_price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price history admin" ON public.provider_price_history;
CREATE POLICY "price history admin" ON public.provider_price_history
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Catalogue change feed for the Admin dashboard widget.
CREATE TABLE IF NOT EXISTS public.provider_catalogue_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  sync_run_id uuid REFERENCES public.provider_sync_runs(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.service_products(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  change_type text NOT NULL,
  needs_review boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_catalogue_changes_type_check CHECK (change_type IN (
    'NEW_PRODUCT','PRICE_INCREASE','PRICE_DECREASE','COVERAGE_CHANGE','VALIDITY_CHANGE',
    'DATA_CHANGE','AVAILABILITY_CHANGE','PRODUCT_REMOVED','PRODUCT_RETURNED'
  ))
);
CREATE INDEX IF NOT EXISTS provider_catalogue_changes_provider_idx ON public.provider_catalogue_changes (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS provider_catalogue_changes_run_idx ON public.provider_catalogue_changes (sync_run_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_catalogue_changes TO authenticated;
GRANT ALL ON public.provider_catalogue_changes TO service_role;
ALTER TABLE public.provider_catalogue_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "catalogue changes admin" ON public.provider_catalogue_changes;
CREATE POLICY "catalogue changes admin" ON public.provider_catalogue_changes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());