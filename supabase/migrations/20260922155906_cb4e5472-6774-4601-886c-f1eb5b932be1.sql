DO $$ BEGIN
  CREATE TYPE public.provisioning_status AS ENUM ('PENDING','IN_PROGRESS','PROVISIONED','FAILED','RESULT_UNKNOWN','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'SUPPLIER_RESULT_UNKNOWN';

CREATE TABLE IF NOT EXISTS public.provisioning_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  unit_index integer NOT NULL,
  service_type public.service_type NOT NULL DEFAULT 'ESIM',
  provider_id uuid REFERENCES public.providers(id),
  status public.provisioning_status NOT NULL DEFAULT 'PENDING',
  idempotency_key text NOT NULL,
  provider_reference text,
  provider_order_status text,
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamp with time zone,
  error_category text,
  error_message text,
  customer_esim_id uuid REFERENCES public.customer_esims(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT provisioning_units_unit_unique UNIQUE (order_item_id, unit_index),
  CONSTRAINT provisioning_units_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS provisioning_units_order_idx ON public.provisioning_units (order_id);
CREATE INDEX IF NOT EXISTS provisioning_units_status_idx ON public.provisioning_units (status);

GRANT SELECT ON public.provisioning_units TO authenticated;
GRANT ALL ON public.provisioning_units TO service_role;

ALTER TABLE public.provisioning_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provisioning units admin read" ON public.provisioning_units;
CREATE POLICY "provisioning units admin read" ON public.provisioning_units
  FOR SELECT TO authenticated USING (public.is_admin());

DROP TRIGGER IF EXISTS provisioning_units_touch ON public.provisioning_units;
CREATE TRIGGER provisioning_units_touch BEFORE UPDATE ON public.provisioning_units
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.customer_esims ADD COLUMN IF NOT EXISTS provider_reference text;

INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('commerce.test_payments', false, 'Internal automated tests only: simulate a confirmed payment. Never enable in production.')
ON CONFLICT (key) DO NOTHING;