CREATE OR REPLACE FUNCTION public.guard_refund_request()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE f text := OLD.status::text; t text := NEW.status::text;
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
     OR NEW.usage_verification IS DISTINCT FROM OLD.usage_verification
     OR NEW.usage_snapshot IS DISTINCT FROM OLD.usage_snapshot
     OR NEW.eligibility IS DISTINCT FROM OLD.eligibility
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Refund request snapshot fields are immutable.';
  END IF;
  IF t <> f THEN
    IF t = 'REFUNDED' THEN
      IF f <> 'APPROVED' OR coalesce(current_setting('travely.payment_refund_confirmed', true), '') <> 'true' THEN
        RAISE EXCEPTION 'REFUNDED requires an approved request and a confirmed payment-provider refund.';
      END IF;
    ELSIF NOT (
      (f = 'REQUESTED' AND t IN ('UNDER_REVIEW','APPROVED','REJECTED','CANCELLED')) OR
      (f = 'UNDER_REVIEW' AND t IN ('APPROVED','REJECTED','CANCELLED')) OR
      (f = 'APPROVED' AND t = 'CANCELLED')
    ) THEN
      RAISE EXCEPTION 'Refund status transition % -> % is not allowed.', f, t;
    END IF;
  END IF;
  NEW.is_open = t IN ('REQUESTED','UNDER_REVIEW','APPROVED');
  NEW.updated_at = now();
  RETURN NEW;
END $$;