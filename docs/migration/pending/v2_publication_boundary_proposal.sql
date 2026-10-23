-- REVIEW ONLY. Never an active migration; no application of this file is authorized.
-- Sole candidate project after separate approval: pizilqgxgfaszhgdtdys.
-- Requires client read-path changes and a grant/view/RPC inventory before application.
-- Table/column names are from the repository baseline; verify live fingerprints first.
BEGIN;
DO $$ BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Review requires the verified trusted owner'; END IF;
END; $$;

ALTER TABLE public.cms_documents ADD COLUMN public_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Projection is maintained by the database for every writer, never by a browser input.
CREATE FUNCTION public.proposed_cms_public_projection() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.public_data := '{}'::jsonb;
  IF NEW.status = 'PUBLISHED' AND NEW.visible
     AND NEW.key IN ('storefront_esim','storefront_lounge','storefront_global',
       'storefront_v2_esim','storefront_v2_lounge','storefront_v2_vignette','legal_center')
     AND pg_catalog.jsonb_typeof(NEW.data->'published') = 'object' THEN
    NEW.public_data := pg_catalog.jsonb_build_object('published',NEW.data->'published');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.proposed_cms_public_projection() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proposed_cms_public_projection BEFORE INSERT OR UPDATE ON public.cms_documents
FOR EACH ROW EXECUTE FUNCTION public.proposed_cms_public_projection();

-- Backfill only the projection. Original draft/published data, status and history remain.
-- Existing touch/revision triggers may advance internal revisions: freeze editors first.
UPDATE public.cms_documents SET public_data = public_data;

-- Revoking a column alone does NOT override an existing table-wide SELECT grant.
-- Clear both levels, including previously explicit column grants, before allowlisting.
DO $$
DECLARE relation_name text; column_names text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['cms_documents','theme_settings','cms_translations','cms_versions'] LOOP
    SELECT pg_catalog.string_agg(pg_catalog.quote_ident(a.attname), ', ' ORDER BY a.attnum)
      INTO column_names FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = pg_catalog.to_regclass('public.' || relation_name)
        AND a.attnum > 0 AND NOT a.attisdropped;
    IF column_names IS NULL THEN RAISE EXCEPTION 'Unexpected schema'; END IF;
    EXECUTE pg_catalog.format('REVOKE SELECT ON TABLE public.%I FROM PUBLIC, anon, authenticated', relation_name);
    EXECUTE pg_catalog.format('REVOKE SELECT (%s) ON TABLE public.%I FROM PUBLIC, anon, authenticated', column_names, relation_name);
  END LOOP;
END;
$$;

GRANT SELECT (id,key,kind,status,visible,published_at,public_data)
ON public.cms_documents TO anon, authenticated;
GRANT SELECT (id,published,published_at) ON public.theme_settings TO anon, authenticated;
-- No public grants on cms_translations.data or cms_versions.snapshot.
-- Existing row policies still restrict publication/visibility; do not disable RLS.
-- Admin server functions already authorize the caller before service-role table access.
-- Authenticated non-Admins have the SAME safe columns as anon, never data/draft/history.

ROLLBACK;
-- Coordinated application proposal, NOT done here:
-- 1. Validate projection and all public readers, including legal_center/navigation/footer.
-- 2. Switch their SELECT data to SELECT data:public_data during the approved cutover.
-- 3. Re-run anon/non-Admin/Admin and public page tests before releasing the editor freeze.
-- Security-preserving rollback: keep restrictive grants/projection and return to maintenance
-- or the compatible reader release. NEVER regrant data/draft to restore an old app version.
-- Do not drop public_data while readers depend on it. No original contents are deleted.
