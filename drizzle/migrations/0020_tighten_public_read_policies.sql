DROP POLICY IF EXISTS "theme public read" ON public.theme_settings;
CREATE POLICY "theme public read" ON public.theme_settings FOR SELECT TO anon, authenticated USING (published IS NOT NULL);
REVOKE SELECT ON public.theme_settings FROM anon, authenticated;
GRANT SELECT (id, published, published_at, updated_at) ON public.theme_settings TO anon, authenticated;

DROP POLICY IF EXISTS "airport content public read" ON public.airport_content;
CREATE POLICY "airport content public read" ON public.airport_content FOR SELECT TO anon, authenticated USING (customer_visible = true);

DROP POLICY IF EXISTS "destination content public read" ON public.destination_content;
CREATE POLICY "destination content public read" ON public.destination_content FOR SELECT TO anon, authenticated USING (customer_visible = true);

DROP POLICY IF EXISTS "route presets public read" ON public.route_presets;
CREATE POLICY "route presets public read" ON public.route_presets FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS "canonical destinations readable" ON public.canonical_destinations;
CREATE POLICY "canonical destinations readable" ON public.canonical_destinations FOR SELECT TO anon, authenticated USING (active = true);