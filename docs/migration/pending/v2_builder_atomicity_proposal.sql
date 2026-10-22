-- REVIEW ONLY. Not an active migration. Do not run against an existing project.
-- Requires an isolated PostgreSQL/Supabase test, owner approval and application wiring.
-- Schema/signatures taken from the checked-in baseline, not a live database inspection.
-- SECURITY INVOKER retains existing RLS; does not introduce privileged bypass.
BEGIN;

CREATE FUNCTION public.proposed_v2_write_atomic(
  _page text,
  _expected_updated_at timestamptz,
  _action text,
  _config jsonb DEFAULT NULL,
  _version_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  doc public.cms_documents%ROWTYPE;
  snapshot jsonb;
  next_config jsonb;
  exists_before boolean;
  document_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;
  IF _page IS NULL OR _page NOT IN ('esim','lounge','vignette') OR _action IS NULL OR _action NOT IN ('draft','publish','restore') THEN
    RAISE EXCEPTION 'Invalid operation' USING ERRCODE = '22023';
  END IF;
  -- Serializes first creation among RPC callers. All future writers must use this RPC.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('storefront_v2_' || _page, 0));
  SELECT * INTO doc FROM public.cms_documents WHERE key = 'storefront_v2_' || _page FOR UPDATE;
  exists_before := FOUND;
  IF (exists_before AND doc.updated_at IS DISTINCT FROM _expected_updated_at)
     OR (NOT exists_before AND _expected_updated_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Stale editor' USING ERRCODE = '40001';
  END IF;
  IF _action = 'restore' THEN
    IF NOT exists_before THEN RAISE EXCEPTION 'Missing document' USING ERRCODE = '22023'; END IF;
    SELECT v.snapshot INTO snapshot FROM public.cms_versions v WHERE v.id = _version_id AND v.document_id = doc.id;
    IF snapshot IS NULL OR snapshot->>'page' IS DISTINCT FROM _page THEN
      RAISE EXCEPTION 'Missing version' USING ERRCODE = '22023';
    END IF;
    next_config := snapshot->'config';
  ELSE
    next_config := _config;
  END IF;
  -- This is structural validation only. Existing V2 sanitization must remain server-side.
  IF next_config IS NULL OR pg_catalog.jsonb_typeof(next_config) IS DISTINCT FROM 'object'
     OR pg_catalog.jsonb_typeof(next_config->'sections') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid config' USING ERRCODE = '22023';
  END IF;
  IF NOT exists_before THEN
    INSERT INTO public.cms_documents(key,kind,status,data)
    VALUES ('storefront_v2_' || _page,'V2_STOREFRONT','DRAFT',pg_catalog.jsonb_build_object('draft',next_config,'published',NULL))
    RETURNING id INTO document_id;
  ELSE
    document_id := doc.id;
    -- Restoring or saving a draft never changes publication status/timestamp/content.
    UPDATE public.cms_documents SET data = pg_catalog.jsonb_set(data,'{draft}',next_config) WHERE id = document_id;
  END IF;
  IF _action = 'publish' THEN
    UPDATE public.cms_documents SET status = 'PUBLISHED', published_at = pg_catalog.now(),
      data = pg_catalog.jsonb_set(data,'{published}',next_config) WHERE id = document_id;
  END IF;
  INSERT INTO public.cms_versions(document_id,created_by,snapshot)
  VALUES (document_id,auth.uid(),pg_catalog.jsonb_build_object('config',next_config,'event',_action,'page',_page,'restoredFrom',_version_id));
  PERFORM public.log_admin_action('storefront_v2.' || _action,'storefront_v2',document_id::text,NULL,
    pg_catalog.jsonb_build_object('page',_page,'versionId',_version_id));
  RETURN document_id;
END;
$$;
REVOKE ALL ON FUNCTION public.proposed_v2_write_atomic(text,timestamptz,text,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proposed_v2_write_atomic(text,timestamptz,text,jsonb,uuid) TO authenticated;

-- Safety: this review script deliberately rolls back its DDL.
ROLLBACK;
-- Post-approval rollback proposal (separate reviewed execution only):
-- DROP FUNCTION public.proposed_v2_write_atomic(text,timestamptz,text,jsonb,uuid);
-- Do not restore old CMS data as a schema rollback; preserve new versions/audit history.
