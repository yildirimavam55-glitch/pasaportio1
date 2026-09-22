-- Travely Guides: product-independent travel content platform (additive only)

CREATE TABLE public.guide_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'compass',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.guide_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  country_isos text[] NOT NULL DEFAULT '{}',
  labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.guides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.guide_categories(id) ON DELETE SET NULL,
  content_type text NOT NULL DEFAULT 'GUIDE'
    CHECK (content_type IN ('GUIDE','DESTINATION','HOW_TO','COMPARISON','ROAD_TRIP','AIRPORT_GUIDE','VIGNETTE_GUIDE')),
  status content_status NOT NULL DEFAULT 'DRAFT',
  published_at timestamptz,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  hero_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  hero_image_url text,
  hero_alt text,
  reading_minutes integer,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.guide_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  locale locale_code NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  intro text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  translation_status content_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, locale),
  UNIQUE (locale, slug)
);

CREATE TABLE public.guide_relations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  relation_type text NOT NULL
    CHECK (relation_type IN ('COUNTRY','REGION','CITY','AIRPORT','ROUTE','SERVICE','PRODUCT')),
  country_iso text,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  city_name text,
  airport_iata text,
  route_id uuid REFERENCES public.guide_routes(id) ON DELETE CASCADE,
  service_type service_type,
  product_id uuid REFERENCES public.service_products(id) ON DELETE SET NULL,
  cta_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guides_status_idx ON public.guides (status, published_at DESC);
CREATE INDEX guides_category_idx ON public.guides (category_id);
CREATE INDEX guide_translations_slug_idx ON public.guide_translations (locale, slug);
CREATE INDEX guide_relations_guide_idx ON public.guide_relations (guide_id);
CREATE INDEX guide_relations_country_idx ON public.guide_relations (country_iso);
CREATE INDEX guide_relations_airport_idx ON public.guide_relations (airport_iata);
CREATE INDEX guide_relations_service_idx ON public.guide_relations (service_type);

GRANT SELECT ON public.guide_categories TO anon;
GRANT SELECT ON public.guide_routes TO anon;
GRANT SELECT ON public.guides TO anon;
GRANT SELECT ON public.guide_translations TO anon;
GRANT SELECT ON public.guide_relations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_translations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_relations TO authenticated;
GRANT ALL ON public.guide_categories TO service_role;
GRANT ALL ON public.guide_routes TO service_role;
GRANT ALL ON public.guides TO service_role;
GRANT ALL ON public.guide_translations TO service_role;
GRANT ALL ON public.guide_relations TO service_role;

ALTER TABLE public.guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guide_categories_public_read" ON public.guide_categories
  FOR SELECT USING (active = true);
CREATE POLICY "guide_categories_admin_all" ON public.guide_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "guide_routes_public_read" ON public.guide_routes
  FOR SELECT USING (active = true);
CREATE POLICY "guide_routes_admin_all" ON public.guide_routes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "guides_public_read" ON public.guides
  FOR SELECT USING (status = 'PUBLISHED'::content_status);
CREATE POLICY "guides_admin_all" ON public.guides
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "guide_translations_public_read" ON public.guide_translations
  FOR SELECT USING (
    translation_status = 'PUBLISHED'::content_status
    AND EXISTS (SELECT 1 FROM public.guides g WHERE g.id = guide_id AND g.status = 'PUBLISHED'::content_status)
  );
CREATE POLICY "guide_translations_admin_all" ON public.guide_translations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "guide_relations_public_read" ON public.guide_relations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.guides g WHERE g.id = guide_id AND g.status = 'PUBLISHED'::content_status)
  );
CREATE POLICY "guide_relations_admin_all" ON public.guide_relations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER guide_categories_touch BEFORE UPDATE ON public.guide_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER guide_routes_touch BEFORE UPDATE ON public.guide_routes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER guides_touch BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER guide_translations_touch BEFORE UPDATE ON public.guide_translations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.guide_categories (slug, icon, sort_order, labels) VALUES
  ('destinasyonlar', 'globe', 10, '{"tr":{"name":"Destinasyonlar"},"de":{"name":"Reiseziele"},"en":{"name":"Destinations"}}'::jsonb),
  ('esim-internet', 'smartphone', 20, '{"tr":{"name":"eSIM & İnternet"},"de":{"name":"eSIM & Internet"},"en":{"name":"eSIM & Internet"}}'::jsonb),
  ('seyahat-rehberleri', 'plane', 30, '{"tr":{"name":"Seyahat Rehberleri"},"de":{"name":"Reiseratgeber"},"en":{"name":"Travel Guides"}}'::jsonb),
  ('havalimani-lounge', 'armchair', 40, '{"tr":{"name":"Havalimanı & Lounge"},"de":{"name":"Flughafen & Lounge"},"en":{"name":"Airport & Lounge"}}'::jsonb),
  ('arabayla-seyahat', 'car', 50, '{"tr":{"name":"Arabayla Seyahat"},"de":{"name":"Mit dem Auto"},"en":{"name":"Road Travel"}}'::jsonb),
  ('vignette-otoyol', 'road', 60, '{"tr":{"name":"Vignette & Otoyol"},"de":{"name":"Vignette & Autobahn"},"en":{"name":"Vignette & Motorway"}}'::jsonb);
