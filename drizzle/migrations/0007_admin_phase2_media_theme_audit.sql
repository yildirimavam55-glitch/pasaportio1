-- Secure admin audit logging (admin_audit_log has no INSERT policy by design)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _entity_type text,
  _entity_id text,
  _before jsonb,
  _after jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.';
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _before, _after)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb, jsonb) TO authenticated;

-- Media library
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  category text NOT NULL DEFAULT 'GLOBAL',
  usage text NOT NULL DEFAULT 'BOTH',
  alt_text text NOT NULL DEFAULT '',
  focal_x numeric NOT NULL DEFAULT 50,
  focal_y numeric NOT NULL DEFAULT 50,
  mime_type text,
  size_bytes bigint,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_category_check CHECK (category IN ('GLOBAL','ESIM','LOUNGE','HERO','DESTINATION','AIRPORT','CAMPAIGN','CROSS_SELL')),
  CONSTRAINT media_assets_usage_check CHECK (usage IN ('DESKTOP','MOBILE','BOTH'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT SELECT ON public.media_assets TO anon;
GRANT ALL ON public.media_assets TO service_role;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media public read" ON public.media_assets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "media admin write" ON public.media_assets FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER media_assets_touch BEFORE UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Persistent storefront theme configuration (draft + published)
CREATE TABLE public.theme_settings (
  id text PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.theme_settings TO authenticated;
GRANT SELECT ON public.theme_settings TO anon;
GRANT ALL ON public.theme_settings TO service_role;

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme public read" ON public.theme_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "theme admin write" ON public.theme_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER theme_settings_touch BEFORE UPDATE ON public.theme_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.theme_settings (id, draft, published) VALUES ('active', '{}'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Storefront feature flags used by the admin flag console
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('storefront.esim', true, 'eSIM storefront visible to customers'),
  ('storefront.lounge', true, 'Lounge storefront visible to customers')
ON CONFLICT (key) DO NOTHING;