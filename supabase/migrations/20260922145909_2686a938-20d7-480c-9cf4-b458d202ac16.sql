UPDATE public.providers
SET low_balance_threshold = 100,
    updated_at = now()
WHERE code = 'ESIM_GO' AND low_balance_threshold IS NULL;