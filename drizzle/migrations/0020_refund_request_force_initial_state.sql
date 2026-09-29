-- OWNER APPROVED: customer refund insert hardening. Every insert starts REQUESTED;
-- non-service callers can never set requester or amount fields. Idempotent.
CREATE OR REPLACE FUNCTION public.refund_request_force_initial_state()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.status := 'REQUESTED';
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.requested_by := auth.uid();
    NEW.amount := NULL; NEW.list_amount := NULL; NEW.discount_amount := 0;
    NEW.amount_basis := jsonb_build_object('source', 'untrusted_client_ignored');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.refund_request_force_initial_state() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS refund_requests_force_initial_state ON public.refund_requests;
CREATE TRIGGER refund_requests_force_initial_state BEFORE INSERT ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.refund_request_force_initial_state();
