-- OWNER APPROVED (2026-09-29): restores ONLY three protections missing after remix.
-- Applied directly to the live backend (the migration journal of the remixed backend
-- does not list 0000-0017, so the migrator cannot run). Every statement is idempotent.

-- ===== PROTECTION 1: supplier cost data (provider_cost, provider_metadata) =====
-- Browser roles keep column-level SELECT on all other columns; Admin/server paths
-- read cost via service role after the server-side has_role check (adminDb).
REVOKE SELECT ON public.service_products FROM anon, authenticated;
REVOKE SELECT ON public.esim_product_details FROM anon, authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_products' AND column_name <> 'provider_cost';
  EXECUTE format('GRANT SELECT (%s) ON public.service_products TO anon, authenticated', cols);
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'esim_product_details' AND column_name <> 'provider_metadata';
  EXECUTE format('GRANT SELECT (%s) ON public.esim_product_details TO anon, authenticated', cols);
END $$;

-- ===== PROTECTION 2: self-only role lookup; no anonymous admin discovery =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  select case
    when _user_id is not null and (_user_id = auth.uid() or coalesce(auth.role(), '') = 'service_role')
      then exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
    else false
  end
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.has_role(uuid, public.app_role)',
    'public.is_admin()',
    'public.list_admin_users()',
    'public.invite_admin(text, text, text)',
    'public.revoke_admin(uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- ===== PROTECTION 3: REFUNDED only after a confirmed payment-provider refund =====
-- travely.payment_refund_confirmed can only be set by a future trusted payment path;
-- no such path exists yet, so REFUNDED is unreachable (fails closed).
CREATE OR REPLACE FUNCTION public.guard_refund_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
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
CREATE OR REPLACE TRIGGER refund_requests_guard
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_refund_request();

CREATE OR REPLACE FUNCTION public.guard_refund_request_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status::text = 'REFUNDED' AND coalesce(current_setting('travely.payment_refund_confirmed', true), '') <> 'true' THEN
    RAISE EXCEPTION 'REFUNDED requires an approved request and a confirmed payment-provider refund.';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER refund_requests_guard_insert
  BEFORE INSERT ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_refund_request_insert();
