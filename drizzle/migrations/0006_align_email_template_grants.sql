REVOKE ALL ON public.email_templates, public.email_template_translations, public.email_template_versions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_template_translations TO authenticated;
GRANT SELECT, INSERT ON public.email_template_versions TO authenticated;
GRANT ALL ON public.email_templates, public.email_template_translations, public.email_template_versions TO service_role;

CREATE TRIGGER email_template_versions_no_truncate
BEFORE TRUNCATE ON public.email_template_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.email_template_versions_append_only();