-- REVIEW ONLY; supersedes the timestamp/invoker-only prototype in the first PR revision.
-- No RPC or migration execution is authorized. Candidate project: pizilqgxgfaszhgdtdys.
-- Must be tested together with v2_publication_boundary_proposal.sql after separate approval.
BEGIN;
DO $$ BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Review requires the verified trusted owner'; END IF;
END; $$;

ALTER TABLE public.cms_documents ADD COLUMN builder_revision bigint NOT NULL DEFAULT 0
  CHECK (builder_revision >= 0);
CREATE FUNCTION public.proposed_cms_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- Every UPDATE, including legacy server writers, invalidates older editor revisions.
  -- Overflow aborts the statement; callers cannot reset the revision through UPDATE.
  NEW.builder_revision := OLD.builder_revision + 1;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.proposed_cms_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proposed_cms_revision BEFORE UPDATE ON public.cms_documents
FOR EACH ROW EXECUTE FUNCTION public.proposed_cms_revision();

-- A new, non-exposed schema; collision aborts rather than trusting unknown existing grants.
CREATE SCHEMA pasaport_cms_private;
REVOKE ALL ON SCHEMA pasaport_cms_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA pasaport_cms_private TO authenticated;

-- Explicit privileged boundary: column revokes deny raw draft reads even to authenticated
-- Admins, so the old SECURITY INVOKER prototype cannot operate after that proposal.
-- This narrowly scoped definer checks the verified JWT subject against user_roles BEFORE
-- reading drafts. Its owner and all dependencies must be reviewed before any EXECUTE grant.
-- Deploy only with a trusted owner; never authenticated/anon or a user-owned search_path.
CREATE FUNCTION pasaport_cms_private.proposed_v2_write_atomic(
  _page text, _expected_revision bigint, _action text,
  _config jsonb DEFAULT NULL, _version_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  doc public.cms_documents%ROWTYPE;
  version_snapshot jsonb;
  next_config jsonb;
  exists_before boolean;
  target_id uuid;
  next_revision bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'
  ) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501'; END IF;
  IF _page IS NULL OR _page NOT IN ('esim','lounge','vignette') OR _action IS NULL
     OR _action NOT IN ('draft','publish','restore') THEN
    RAISE EXCEPTION 'Invalid operation' USING ERRCODE = '22023';
  END IF;
  -- Serializes absent-row creation between RPC users; a legacy competing INSERT can
  -- still yield a unique violation, which aborts this transaction without partial writes.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('storefront_v2_' || _page, 0));
  SELECT * INTO doc FROM public.cms_documents WHERE key = 'storefront_v2_' || _page FOR UPDATE;
  exists_before := FOUND;
  IF (exists_before AND (_expected_revision IS NULL OR doc.builder_revision <> _expected_revision))
     OR (NOT exists_before AND _expected_revision IS NOT NULL) THEN
    RAISE EXCEPTION 'Stale editor' USING ERRCODE = '40001';
  END IF;
  IF exists_before AND pg_catalog.jsonb_typeof(doc.data) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid document' USING ERRCODE = '22023';
  END IF;
  IF _action = 'restore' THEN
    IF NOT exists_before THEN RAISE EXCEPTION 'Missing document' USING ERRCODE = '22023'; END IF;
    SELECT v.snapshot INTO version_snapshot FROM public.cms_versions v
      WHERE v.id = _version_id AND v.document_id = doc.id;
    IF version_snapshot IS NULL OR version_snapshot->>'page' IS DISTINCT FROM _page THEN
      RAISE EXCEPTION 'Missing version' USING ERRCODE = '22023';
    END IF;
    next_config := version_snapshot->'config';
  ELSE
    next_config := _config;
  END IF;
  -- Structural guard only: application sanitization, claim checks and locale validation
  -- remain mandatory. This function is not wired into any current application call.
  IF next_config IS NULL OR pg_catalog.jsonb_typeof(next_config) IS DISTINCT FROM 'object'
     OR next_config->>'page' IS DISTINCT FROM _page
     OR pg_catalog.jsonb_typeof(next_config->'sections') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid config' USING ERRCODE = '22023';
  END IF;
  IF NOT exists_before THEN
    INSERT INTO public.cms_documents(key,kind,status,data)
      VALUES ('storefront_v2_' || _page,'V2_STOREFRONT','DRAFT',
        pg_catalog.jsonb_build_object('draft',next_config,'published',NULL))
      RETURNING id INTO target_id;
  ELSE target_id := doc.id;
  END IF;
  IF _action = 'publish' THEN
    UPDATE public.cms_documents SET status = 'PUBLISHED', published_at = pg_catalog.now(),
      data = pg_catalog.jsonb_set(pg_catalog.jsonb_set(data,'{draft}',next_config),'{published}',next_config)
      WHERE id = target_id RETURNING builder_revision INTO next_revision;
  ELSIF exists_before THEN
    -- Draft/restore preserve publication content, status and timestamp exactly.
    UPDATE public.cms_documents SET data = pg_catalog.jsonb_set(data,'{draft}',next_config)
      WHERE id = target_id RETURNING builder_revision INTO next_revision;
  ELSE SELECT builder_revision INTO next_revision FROM public.cms_documents WHERE id = target_id;
  END IF;
  INSERT INTO public.cms_versions(document_id,created_by,snapshot)
    VALUES (target_id,auth.uid(),pg_catalog.jsonb_build_object('config',next_config,
      'event',_action,'page',_page,'restoredFrom',_version_id,'revision',next_revision));
  PERFORM public.log_admin_action('storefront_v2.' || _action,'storefront_v2',target_id::text,NULL,
    pg_catalog.jsonb_build_object('page',_page,'versionId',_version_id,'revision',next_revision));
  -- No exception swallowing: document/version/audit/projection failure aborts everything.
  RETURN pg_catalog.jsonb_build_object('id',target_id,'revision',next_revision);
END;
$$;
REVOKE ALL ON FUNCTION pasaport_cms_private.proposed_v2_write_atomic(text,bigint,text,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pasaport_cms_private.proposed_v2_write_atomic(text,bigint,text,jsonb,uuid) TO authenticated;

CREATE FUNCTION public.proposed_v2_write_atomic(
  _page text, _expected_revision bigint, _action text,
  _config jsonb DEFAULT NULL, _version_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT pasaport_cms_private.proposed_v2_write_atomic(_page,_expected_revision,_action,_config,_version_id);
$$;
REVOKE ALL ON FUNCTION public.proposed_v2_write_atomic(text,bigint,text,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proposed_v2_write_atomic(text,bigint,text,jsonb,uuid) TO authenticated;

ROLLBACK;
-- No state survives this review script. After approval, application rollback must stop all
-- new RPC callers first, retain revision/publication isolation and audit/version records,
-- and keep unsafe deletion disabled. Remove only the reviewed new functions/triggers after
-- dependency checks; never DROP SCHEMA CASCADE or restore broad draft grants.
