ALTER TYPE public.refund_status ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE public.refund_status ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE public.refund_status ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE public.refund_requests ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.refund_requests
  ADD COLUMN IF NOT EXISTS customer_esim_id uuid REFERENCES public.customer_esims(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_at timestamptz,
  ADD COLUMN IF NOT EXISTS window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS list_amount numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reason_code text,
  ADD COLUMN IF NOT EXISTS usage_verification text NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS usage_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS eligibility text NOT NULL DEFAULT 'REVIEW_REQUIRED',
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_message text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_refund_reference text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_one_open_per_item
  ON public.refund_requests (order_item_id)
  WHERE order_item_id IS NOT NULL AND is_open;
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_one_open_per_esim
  ON public.refund_requests (customer_esim_id)
  WHERE customer_esim_id IS NOT NULL AND is_open;
CREATE INDEX IF NOT EXISTS refund_requests_requested_by_idx ON public.refund_requests (requested_by, created_at DESC);

DROP POLICY IF EXISTS "refunds request" ON public.refund_requests;
DROP POLICY IF EXISTS "refunds admin update" ON public.refund_requests;
CREATE POLICY "refunds admin update" ON public.refund_requests
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, UPDATE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

CREATE OR REPLACE FUNCTION public.guard_refund_request()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.order_item_id IS DISTINCT FROM OLD.order_item_id
     OR NEW.customer_esim_id IS DISTINCT FROM OLD.customer_esim_id
     OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
     OR NEW.purchase_at IS DISTINCT FROM OLD.purchase_at
     OR NEW.window_ends_at IS DISTINCT FROM OLD.window_ends_at
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.list_amount IS DISTINCT FROM OLD.list_amount
     OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
     OR NEW.amount_basis IS DISTINCT FROM OLD.amount_basis
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.reason_code IS DISTINCT FROM OLD.reason_code
     OR NEW.is_test IS DISTINCT FROM OLD.is_test
     OR NEW.product_snapshot IS DISTINCT FROM OLD.product_snapshot
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Refund request snapshot fields are immutable.';
  END IF;
  IF NEW.status::text = 'REFUNDED' AND OLD.status::text <> 'REFUNDED'
     AND coalesce(current_setting('travely.payment_refund_confirmed', true), '') <> 'true' THEN
    RAISE EXCEPTION 'REFUNDED requires a confirmed payment-provider refund.';
  END IF;
  IF OLD.status::text IN ('REJECTED','REFUNDED','CANCELLED') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Closed refund requests cannot change status.';
  END IF;
  NEW.is_open = NEW.status::text IN ('REQUESTED','UNDER_REVIEW','APPROVED');
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.refund_request_set_open()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.is_open = NEW.status::text IN ('REQUESTED','UNDER_REVIEW','APPROVED');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS refund_requests_set_open ON public.refund_requests;
CREATE TRIGGER refund_requests_set_open BEFORE INSERT ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.refund_request_set_open();
DROP TRIGGER IF EXISTS refund_requests_guard ON public.refund_requests;
CREATE TRIGGER refund_requests_guard BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_refund_request();

CREATE TABLE IF NOT EXISTS public.refund_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id uuid NOT NULL REFERENCES public.refund_requests(id) ON DELETE RESTRICT,
  actor_id uuid,
  actor_type text NOT NULL,
  event text NOT NULL,
  from_status text,
  to_status text,
  order_id uuid,
  order_item_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.refund_request_events TO authenticated;
GRANT ALL ON public.refund_request_events TO service_role;
ALTER TABLE public.refund_request_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refund events admin read" ON public.refund_request_events
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "refund events admin write" ON public.refund_request_events
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND actor_id = auth.uid() AND actor_type = 'ADMIN');
CREATE INDEX IF NOT EXISTS refund_request_events_request_idx ON public.refund_request_events (refund_request_id, created_at);

CREATE OR REPLACE FUNCTION public.refund_events_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Refund events are append-only.'; END $$;
DROP TRIGGER IF EXISTS refund_request_events_no_change ON public.refund_request_events;
CREATE TRIGGER refund_request_events_no_change BEFORE UPDATE OR DELETE ON public.refund_request_events
  FOR EACH ROW EXECUTE FUNCTION public.refund_events_append_only();