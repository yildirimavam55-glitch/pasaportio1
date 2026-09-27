REVOKE EXECUTE ON FUNCTION public.public_promotion_banner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_promotion_banner() TO service_role;