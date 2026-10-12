ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'CRITICAL_PROVIDER_BALANCE';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'EMPTY_PROVIDER_BALANCE';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'PROVIDER_BALANCE_DROP';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'PROVIDER_BALANCE_UNAVAILABLE';

ALTER TABLE public.ops_alerts ADD COLUMN IF NOT EXISTS dedupe_key text;
ALTER TABLE public.ops_alerts ADD COLUMN IF NOT EXISTS acknowledged_by uuid;
ALTER TABLE public.ops_alerts ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
ALTER TABLE public.ops_alerts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS ops_alerts_open_dedupe_key_uidx
  ON public.ops_alerts (dedupe_key) WHERE dedupe_key IS NOT NULL AND status <> 'RESOLVED';

CREATE TABLE IF NOT EXISTS public.provider_balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  ok boolean NOT NULL,
  amount numeric(14,4),
  currency text,
  error_code text,
  source text NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL','SCHEDULED','TEST')),
  checked_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((ok AND amount IS NOT NULL AND currency IS NOT NULL) OR (NOT ok))
);
CREATE INDEX IF NOT EXISTS provider_balance_snapshots_provider_time_idx ON public.provider_balance_snapshots (provider_id, checked_at DESC);
GRANT SELECT ON public.provider_balance_snapshots TO authenticated;
GRANT ALL ON public.provider_balance_snapshots TO service_role;
ALTER TABLE public.provider_balance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "balance snapshots admin read" ON public.provider_balance_snapshots FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.provider_balance_monitor_settings (
  provider_id uuid PRIMARY KEY REFERENCES public.providers(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  threshold_currency text,
  low_threshold numeric(14,4) NOT NULL DEFAULT 500 CHECK (low_threshold >= 0),
  critical_threshold numeric(14,4) NOT NULL DEFAULT 200 CHECK (critical_threshold >= 0),
  drop_percent numeric(5,2) NOT NULL DEFAULT 50 CHECK (drop_percent > 0 AND drop_percent <= 100),
  drop_window_hours integer NOT NULL DEFAULT 24 CHECK (drop_window_hours BETWEEN 1 AND 168),
  unavailable_after_minutes integer NOT NULL DEFAULT 120 CHECK (unavailable_after_minutes BETWEEN 15 AND 10080),
  check_interval_minutes integer NOT NULL DEFAULT 15 CHECK (check_interval_minutes BETWEEN 5 AND 1440),
  thresholds_confirmed boolean NOT NULL DEFAULT false,
  last_scheduled_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CHECK (critical_threshold <= low_threshold)
);
GRANT SELECT ON public.provider_balance_monitor_settings TO authenticated;
GRANT ALL ON public.provider_balance_monitor_settings TO service_role;
ALTER TABLE public.provider_balance_monitor_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "balance settings admin read" ON public.provider_balance_monitor_settings FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.admin_notification_channels (
  channel text PRIMARY KEY CHECK (channel IN ('EMAIL','TELEGRAM','WHATSAPP')),
  enabled boolean NOT NULL DEFAULT false CHECK (enabled = false),
  min_severity text NOT NULL DEFAULT 'CRITICAL' CHECK (min_severity IN ('WARNING','CRITICAL','URGENT')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.admin_notification_channels IS 'Design-only outbound alert channels. enabled is pinned false until a messaging integration is approved; config never stores secrets.';
GRANT SELECT ON public.admin_notification_channels TO authenticated;
GRANT ALL ON public.admin_notification_channels TO service_role;
ALTER TABLE public.admin_notification_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification channels admin read" ON public.admin_notification_channels FOR SELECT TO authenticated USING (public.is_admin());
INSERT INTO public.admin_notification_channels (channel) VALUES ('EMAIL'),('TELEGRAM'),('WHATSAPP') ON CONFLICT DO NOTHING;