ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'ARCHIVED';

CREATE TABLE IF NOT EXISTS public.seo_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio jsonb NOT NULL DEFAULT '{}'::jsonb,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_authors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_authors TO authenticated;
GRANT ALL ON public.seo_authors TO service_role;
ALTER TABLE public.seo_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_authors_public_read" ON public.seo_authors FOR SELECT USING (true);
CREATE POLICY "seo_authors_admin_all" ON public.seo_authors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER seo_authors_touch BEFORE UPDATE ON public.seo_authors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS country_iso text,
  ADD COLUMN IF NOT EXISTS city_name text,
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.seo_authors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS indexable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS canonical_override text,
  ADD COLUMN IF NOT EXISTS related_guide_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_product_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.guide_translations
  ADD COLUMN IF NOT EXISTS h1 text,
  ADD COLUMN IF NOT EXISTS hero_alt text,
  ADD COLUMN IF NOT EXISTS city_facts jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS guides_country_iso_idx ON public.guides(country_iso);