CREATE TABLE public.esim_usage_settings (
  id text PRIMARY KEY DEFAULT 'default',
  config jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.esim_usage_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.esim_usage_settings TO authenticated;
GRANT ALL ON public.esim_usage_settings TO service_role;

ALTER TABLE public.esim_usage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usage settings are publicly readable"
ON public.esim_usage_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert usage settings"
ON public.esim_usage_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update usage settings"
ON public.esim_usage_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.esim_usage_settings (id, config) VALUES (
  'default',
  '{"perDayMb":{"MESSAGING":50,"SOCIAL":250,"MAPS":80,"VIDEO":900,"WORK":300,"GAMING":200,"HOTSPOT":500},"intensityMultipliers":{"LOW":0.7,"NORMAL":1,"HIGH":1.4},"safetyBufferPercent":20,"minimumRecommendedGb":1,"packageSizesGb":[1,3,5,10,20,50],"roundingStrategy":"NEXT_PACKAGE_UP"}'::jsonb
);