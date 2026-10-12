CREATE TABLE public.pdf_templates (
  kind text PRIMARY KEY CHECK (kind IN ('invoice','order-summary','credit-note','esim-guide')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  active boolean NOT NULL DEFAULT true,
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.pdf_template_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_kind text NOT NULL REFERENCES public.pdf_templates(kind) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('tr','en','de','fr','es','it','pt','nl','pl','ar','ru','ja','ko','zh')),
  labels jsonb NOT NULL CHECK (jsonb_typeof(labels) = 'object' AND pg_column_size(labels) <= 32000),
  draft boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (template_kind, locale)
);

CREATE TABLE public.pdf_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_kind text NOT NULL REFERENCES public.pdf_templates(kind) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version >= 1),
  snapshot jsonb NOT NULL,
  change_note text NOT NULL DEFAULT '' CHECK (char_length(change_note) <= 300),
  restored_from integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_kind, version)
);

REVOKE ALL ON public.pdf_templates, public.pdf_template_translations, public.pdf_template_versions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pdf_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_template_translations TO authenticated;
GRANT SELECT, INSERT ON public.pdf_template_versions TO authenticated;
GRANT ALL ON public.pdf_templates, public.pdf_template_translations, public.pdf_template_versions TO service_role;

ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_template_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pdf templates" ON public.pdf_templates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage pdf template translations" ON public.pdf_template_translations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins read pdf template versions" ON public.pdf_template_versions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins append pdf template versions" ON public.pdf_template_versions FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.pdf_template_versions_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'PDF sablon surumleri degistirilemez veya silinemez.';
END;
$$;

CREATE TRIGGER pdf_template_versions_immutable BEFORE UPDATE OR DELETE ON public.pdf_template_versions FOR EACH ROW EXECUTE FUNCTION public.pdf_template_versions_append_only();
CREATE TRIGGER pdf_template_versions_no_truncate BEFORE TRUNCATE ON public.pdf_template_versions FOR EACH STATEMENT EXECUTE FUNCTION public.pdf_template_versions_append_only();
CREATE TRIGGER pdf_templates_touch BEFORE UPDATE ON public.pdf_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER pdf_template_translations_touch BEFORE UPDATE ON public.pdf_template_translations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();