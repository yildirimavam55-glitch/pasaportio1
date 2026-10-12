CREATE TABLE public.email_templates (
  key text PRIMARY KEY CHECK (key IN ('welcome','email-verification','password-reset','order-confirmation','esim-delivery','payment-failed','refund-approved','support-notification','account-deletion')),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.email_template_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL REFERENCES public.email_templates(key) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('tr','en','de','fr','es','it','pt','nl','pl','ar','ru','ja','ko','zh')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  preheader text NOT NULL DEFAULT '' CHECK (char_length(preheader) <= 250),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (template_key, locale)
);

CREATE TABLE public.email_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL REFERENCES public.email_templates(key) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version >= 1),
  snapshot jsonb NOT NULL,
  change_note text NOT NULL DEFAULT '',
  restored_from integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key, version)
);

GRANT SELECT, INSERT, UPDATE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_template_translations TO authenticated;
GRANT SELECT, INSERT ON public.email_template_versions TO authenticated;
GRANT ALL ON public.email_templates, public.email_template_translations, public.email_template_versions TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email templates" ON public.email_templates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage email template translations" ON public.email_template_translations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins read email template versions" ON public.email_template_versions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins append email template versions" ON public.email_template_versions FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.email_template_versions_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'E-posta sablon surumleri degistirilemez veya silinemez.';
END;
$$;

CREATE TRIGGER email_template_versions_immutable
BEFORE UPDATE OR DELETE ON public.email_template_versions
FOR EACH ROW EXECUTE FUNCTION public.email_template_versions_append_only();

CREATE TRIGGER email_templates_touch BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER email_template_translations_touch BEFORE UPDATE ON public.email_template_translations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();