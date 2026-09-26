CREATE TABLE public.vignette_supplier_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL DEFAULT 'SANDBOX' CHECK (environment = 'SANDBOX'),
  http_status integer,
  ok boolean NOT NULL DEFAULT false,
  error text,
  product_count integer NOT NULL DEFAULT 0,
  raw_response jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vignette_supplier_snapshots TO authenticated;
GRANT ALL ON public.vignette_supplier_snapshots TO service_role;
ALTER TABLE public.vignette_supplier_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read vignette snapshots" ON public.vignette_supplier_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert vignette snapshots" ON public.vignette_supplier_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));