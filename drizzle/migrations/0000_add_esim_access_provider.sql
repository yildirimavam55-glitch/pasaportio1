ALTER TABLE public.providers DROP CONSTRAINT providers_adapter_type_check;
ALTER TABLE public.providers ADD CONSTRAINT providers_adapter_type_check CHECK (adapter_type = ANY (ARRAY['NATIVE_ESIM_GO','NATIVE_ESIM_ACCESS','GENERIC_REST','CUSTOM']));
INSERT INTO public.providers (code, name, service_type, adapter_type, active, auto_sync, priority, currency, capabilities, sync_interval_hours, minimum_margin_percent, low_balance_threshold, notes)
SELECT 'ESIM_ACCESS', 'eSIM Access', 'ESIM', 'NATIVE_ESIM_ACCESS', true, false, 2, 'USD', '{CATALOGUE,BALANCE}', 24, 25, 100,
 'Faz 2: yalnizca katalog senkronizasyonu. Siparis ve saglama kapali. Yeni paketler TASLAK gelir.'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE code='ESIM_ACCESS');
INSERT INTO public.provider_connections (provider_id, base_url, credential_secret_names, environment, status, config)
SELECT id, 'https://api.esimaccess.com', ARRAY['ESIM_ACCESS_ACCESS_CODE'], 'production', 'NOT_CONFIGURED', '{"authType":"API_KEY_HEADER","endpoints":{},"fieldMap":{},"pageSize":500,"maxPages":1}'::jsonb
FROM public.providers p WHERE p.code='ESIM_ACCESS' AND NOT EXISTS (SELECT 1 FROM public.provider_connections c WHERE c.provider_id=p.id);