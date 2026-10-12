REVOKE ALL ON public.account_deletion_requests FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.account_deletion_requests FROM authenticated;
GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

CREATE OR REPLACE FUNCTION public.deletion_request_force_initial_state()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.status := 'REQUESTED';
    NEW.processed_at := NULL;
    NEW.requested_at := now();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.deletion_request_force_initial_state() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS account_deletion_requests_initial_state ON public.account_deletion_requests;
CREATE TRIGGER account_deletion_requests_initial_state
BEFORE INSERT ON public.account_deletion_requests
FOR EACH ROW EXECUTE FUNCTION public.deletion_request_force_initial_state();

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_one_open
ON public.account_deletion_requests (user_id) WHERE status IN ('REQUESTED','IN_REVIEW');