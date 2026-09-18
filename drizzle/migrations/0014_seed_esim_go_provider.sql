-- Provider #1: eSIM Go, catalogue-only. No credentials are stored in the database.
INSERT INTO public.providers (code, name, service_type, adapter_type, capabilities, priority, active, currency, auto_sync, sync_interval_hours, minimum_margin_percent, notes)
VALUES (
  'ESIM_GO', 'eSIM Go', 'ESIM', 'NATIVE_ESIM_GO',
  ARRAY['CATALOGUE','REAL_TIME_AVAILABILITY','BALANCE']::provider_capability[],
  1, true, 'EUR', true, 24, 25,
  'Faz 2A: yalnizca katalog senkronizasyonu. Gercek siparis veya saglama yapilmaz.'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provider_connections (provider_id, environment, base_url, credential_secret_names, status, config)
SELECT p.id, 'production', 'https://api.esim-go.com/v2.4', ARRAY['ESIM_GO_API_KEY'], 'CREDENTIAL_REQUIRED',
       jsonb_build_object('authType','API_KEY_HEADER','pageSize',100,'maxPages',60,'endpoints', jsonb_build_object('catalogue','/catalogue','balance','/organisation'),'fieldMap', '{}'::jsonb)
FROM public.providers p
WHERE p.code = 'ESIM_GO'
ON CONFLICT (provider_id, environment) DO NOTHING;