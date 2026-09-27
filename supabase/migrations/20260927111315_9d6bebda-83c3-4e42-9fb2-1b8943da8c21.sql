CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'PAUSED' CHECK (status IN ('ACTIVE','PAUSED','ARCHIVED')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('PERCENT','FIXED')),
  discount_value numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  services text[] NOT NULL DEFAULT '{ESIM}',
  country_scope text NOT NULL DEFAULT 'ALL' CHECK (country_scope IN ('ALL','SELECTED')),
  country_isos text[] NOT NULL DEFAULT '{}',
  product_scope text NOT NULL DEFAULT 'ALL' CHECK (product_scope IN ('ALL','SELECTED')),
  product_ids uuid[] NOT NULL DEFAULT '{}',
  package_type text NOT NULL DEFAULT 'ALL' CHECK (package_type IN ('ALL','STANDARD','UNLIMITED')),
  package_scopes text[] NOT NULL DEFAULT '{COUNTRY}',
  total_limit integer CHECK (total_limit IS NULL OR total_limit > 0),
  per_customer_limit integer CHECK (per_customer_limit IS NULL OR per_customer_limit > 0),
  min_order numeric(12,2) CHECK (min_order IS NULL OR min_order >= 0),
  banner_visible boolean NOT NULL DEFAULT false,
  banner_text jsonb NOT NULL DEFAULT '{}'::jsonb,
  banner_show_code boolean NOT NULL DEFAULT true,
  banner_show_copy boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotions_code_format CHECK (code ~ '^[A-Z0-9_-]{3,32}$'),
  CONSTRAINT promotions_window CHECK (ends_at > starts_at),
  CONSTRAINT promotions_value CHECK (
    (discount_type = 'PERCENT' AND discount_value > 0 AND discount_value <= 100)
    OR (discount_type = 'FIXED' AND discount_value > 0)
  )
);
CREATE UNIQUE INDEX promotions_code_key ON public.promotions (code);
GRANT SELECT, INSERT, UPDATE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions admin read" ON public.promotions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "promotions admin insert" ON public.promotions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "promotions admin update" ON public.promotions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER promotions_touch BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid,
  discount_amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, order_id)
);
CREATE INDEX promotion_redemptions_customer_idx ON public.promotion_redemptions (promotion_id, customer_id);
GRANT SELECT ON public.promotion_redemptions TO authenticated;
GRANT ALL ON public.promotion_redemptions TO service_role;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotion redemptions admin read" ON public.promotion_redemptions FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.orders
  ADD COLUMN promotion_id uuid REFERENCES public.promotions(id) ON DELETE RESTRICT,
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_type text,
  ADD COLUMN discount_value numeric(12,2),
  ADD COLUMN original_subtotal numeric(12,4),
  ADD COLUMN final_subtotal numeric(12,4);

CREATE OR REPLACE FUNCTION public.public_promotion_banner()
RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric, currency text, banner_text jsonb, show_code boolean, show_copy boolean, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, CASE WHEN p.banner_show_code THEN p.code ELSE NULL END, p.discount_type, p.discount_value, p.currency,
         p.banner_text, p.banner_show_code, p.banner_show_copy, p.ends_at
  FROM public.promotions p
  WHERE p.status = 'ACTIVE' AND p.banner_visible AND p.starts_at <= now() AND p.ends_at > now()
  ORDER BY p.starts_at DESC LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.public_promotion_banner() TO anon, authenticated;