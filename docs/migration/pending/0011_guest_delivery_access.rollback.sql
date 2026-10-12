-- Rollback for 0011 (PENDING). Removes guest link storage; existing links stop working.
DROP TABLE IF EXISTS public.order_access_tokens;
