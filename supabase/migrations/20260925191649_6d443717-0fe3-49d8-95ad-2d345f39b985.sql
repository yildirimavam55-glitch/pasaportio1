ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS rel_service text NOT NULL DEFAULT 'GENERAL' CHECK (rel_service IN ('ESIM','LOUNGE','VIGNETTE','GENERAL')),
  ADD COLUMN IF NOT EXISTS rel_type text NOT NULL DEFAULT 'GENERAL' CHECK (rel_type IN ('COUNTRY','CITY','REGION','AIRPORT','ROUTE','GENERAL')),
  ADD COLUMN IF NOT EXISTS rel_region text,
  ADD COLUMN IF NOT EXISTS rel_airport text,
  ADD COLUMN IF NOT EXISTS rel_commercial_page text,
  ADD COLUMN IF NOT EXISTS rel_esim_destination text,
  ADD COLUMN IF NOT EXISTS rel_lounge text,
  ADD COLUMN IF NOT EXISTS rel_vignette text,
  ADD COLUMN IF NOT EXISTS show_on_commercial boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_relation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS concept_key text;
CREATE INDEX IF NOT EXISTS guides_rel_service_country_idx ON public.guides (rel_service, country_iso);