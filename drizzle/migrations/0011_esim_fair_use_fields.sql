ALTER TABLE public.esim_product_details
  ADD COLUMN IF NOT EXISTS fair_use_policy text,
  ADD COLUMN IF NOT EXISTS high_speed_allowance text,
  ADD COLUMN IF NOT EXISTS speed_after_fair_use text;
COMMENT ON COLUMN public.esim_product_details.fair_use_policy IS 'Provider fair-use policy value, stored verbatim.';
COMMENT ON COLUMN public.esim_product_details.high_speed_allowance IS 'Provider high-speed allowance value (e.g. "2 GB/day"), stored verbatim.';
COMMENT ON COLUMN public.esim_product_details.speed_after_fair_use IS 'Provider speed after fair use (e.g. "512 kbps"), stored verbatim.';