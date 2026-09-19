-- 1. Explicit sync accounting
ALTER TABLE public.provider_sync_runs
  ADD COLUMN IF NOT EXISTS items_parsed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_invalid integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_duplicate integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_excluded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warnings integer NOT NULL DEFAULT 0;

ALTER TYPE public.sync_status ADD VALUE IF NOT EXISTS 'SUCCESS_WITH_WARNINGS';

-- 2. Subdivision-aware coverage + metadata provenance
ALTER TABLE public.esim_product_details
  ADD COLUMN IF NOT EXISTS coverage_subdivision_codes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS unlimited_details_complete boolean,
  ADD COLUMN IF NOT EXISTS metadata_provenance jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Canonical destination directory (COUNTRY / TERRITORY / SUBDIVISION / REGION)
CREATE TABLE IF NOT EXISTS public.canonical_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_code text NOT NULL UNIQUE,
  provider_code text,
  display_name text NOT NULL,
  parent_country_iso text,
  type text NOT NULL DEFAULT 'COUNTRY',
  active boolean NOT NULL DEFAULT true,
  has_sellable_products boolean NOT NULL DEFAULT false,
  sellable_product_count integer NOT NULL DEFAULT 0,
  refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.canonical_destinations TO anon;
GRANT SELECT ON public.canonical_destinations TO authenticated;
GRANT ALL ON public.canonical_destinations TO service_role;

ALTER TABLE public.canonical_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canonical destinations readable" ON public.canonical_destinations;
CREATE POLICY "canonical destinations readable"
  ON public.canonical_destinations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "canonical destinations admin write" ON public.canonical_destinations;
CREATE POLICY "canonical destinations admin write"
  ON public.canonical_destinations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS canonical_destinations_type_idx ON public.canonical_destinations (type, active);
CREATE INDEX IF NOT EXISTS esim_details_subdivision_idx ON public.esim_product_details USING gin (coverage_subdivision_codes);