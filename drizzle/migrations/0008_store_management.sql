ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS height integer;

CREATE TABLE IF NOT EXISTS public.destination_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL UNIQUE REFERENCES public.countries(id) ON DELETE CASCADE,
  featured boolean NOT NULL DEFAULT false,
  customer_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  mobile_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destination_content TO authenticated;
GRANT SELECT ON public.destination_content TO anon;
GRANT ALL ON public.destination_content TO service_role;
ALTER TABLE public.destination_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "destination content public read" ON public.destination_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "destination content admin write" ON public.destination_content FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER destination_content_touch BEFORE UPDATE ON public.destination_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.airport_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id uuid NOT NULL UNIQUE REFERENCES public.airports(id) ON DELETE CASCADE,
  featured boolean NOT NULL DEFAULT false,
  customer_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  mobile_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.airport_content TO authenticated;
GRANT SELECT ON public.airport_content TO anon;
GRANT ALL ON public.airport_content TO service_role;
ALTER TABLE public.airport_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "airport content public read" ON public.airport_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "airport content admin write" ON public.airport_content FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER airport_content_touch BEFORE UPDATE ON public.airport_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.route_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'Route',
  countries text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  mobile_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_presets TO authenticated;
GRANT SELECT ON public.route_presets TO anon;
GRANT ALL ON public.route_presets TO service_role;
ALTER TABLE public.route_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "route presets public read" ON public.route_presets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "route presets admin write" ON public.route_presets FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER route_presets_touch BEFORE UPDATE ON public.route_presets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_type public.service_type,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  cta_href text NOT NULL DEFAULT '/',
  media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  mobile_media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  airport_id uuid REFERENCES public.airports(id) ON DELETE SET NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT ON public.campaigns TO anon;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns public read" ON public.campaigns FOR SELECT TO anon, authenticated
  USING (active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "campaigns admin read" ON public.campaigns FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "campaigns admin write" ON public.campaigns FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER campaigns_touch BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT SELECT ON public.platform_settings TO anon;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform settings public read" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "platform settings admin write" ON public.platform_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER platform_settings_touch BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.platform_settings (id, data) VALUES ('active', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('checkout.esim', true, 'eSIM satin alma akisi'),
  ('checkout.lounge', true, 'Lounge satin alma akisi')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.route_presets (slug, icon, countries, sort_order, active, featured, content) VALUES
  ('sila-yolu', 'Route', ARRAY['TR','BG','RS','HU','AT','DE'], 1, true, true,
   '{"title":{"tr":"Sıla Yolu","de":"Heimatroute","en":"Homeland route"},"description":{"tr":"Avrupa''dan Türkiye''ye karayolu güzergâhı boyunca kesintisiz bağlantı.","de":"Durchgehende Verbindung auf der Strecke von Europa in die Türkei.","en":"Continuous connectivity along the Europe to Türkiye road route."}}'::jsonb)
ON CONFLICT (slug) DO NOTHING;