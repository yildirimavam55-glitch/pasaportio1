CREATE TABLE public.customer_notification_preferences (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  marketing_email boolean NOT NULL DEFAULT false,
  product_tips_email boolean NOT NULL DEFAULT false,
  consent_updated_at timestamptz,
  consent_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.customer_notification_preferences TO authenticated;
GRANT ALL ON public.customer_notification_preferences TO service_role;

ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notification prefs select" ON public.customer_notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notification prefs insert" ON public.customer_notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notification prefs update" ON public.customer_notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER customer_notification_preferences_touch
  BEFORE UPDATE ON public.customer_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.account_deletion_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'REQUESTED',
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_deletion_requests_status_check
    CHECK (status IN ('REQUESTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED'))
);

CREATE INDEX account_deletion_requests_user_idx ON public.account_deletion_requests(user_id);

GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own deletion requests select" ON public.account_deletion_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "own deletion requests insert" ON public.account_deletion_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER account_deletion_requests_touch
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();