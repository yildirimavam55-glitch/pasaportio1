-- REVIEW / ISOLATED TEST ONLY. Never execute on an existing project without separate approval.
-- Requires both PR3 proposal objects, projection backfill and existing role/audit helpers.
BEGIN;
CREATE FUNCTION pasaport_cms_private.builder_read(_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doc public.cms_documents%ROWTYPE; history jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF _key IS NULL OR _key NOT IN ('storefront_v2_esim','storefront_v2_lounge','storefront_v2_vignette','storefront_global','storefront_esim','storefront_lounge','storefront_theme') THEN RAISE EXCEPTION 'Invalid key' USING ERRCODE='22023'; END IF;
 SELECT * INTO doc FROM public.cms_documents WHERE key=_key;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',v.id,'createdAt',v.created_at,'event',v.snapshot->>'event','author','Admin','sections',coalesce(jsonb_array_length(v.snapshot->'config'->'sections'),0)) ORDER BY v.created_at DESC),'[]') INTO history FROM (SELECT * FROM public.cms_versions WHERE document_id=doc.id ORDER BY created_at DESC LIMIT 30) v;
 RETURN jsonb_build_object('revision',doc.builder_revision,'draft',doc.data->'draft','published',doc.data->'published','publishedAt',doc.published_at,'updatedAt',doc.updated_at,'versions',history);
END; $$;
REVOKE ALL ON FUNCTION pasaport_cms_private.builder_read(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION pasaport_cms_private.builder_read(text) TO authenticated;
CREATE FUNCTION public.builder_read(_key text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT pasaport_cms_private.builder_read(_key); $$;
REVOKE ALL ON FUNCTION public.builder_read(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.builder_read(text) TO authenticated;
CREATE FUNCTION pasaport_cms_private.builder_write(_key text,_expected_revision bigint,_action text,_config jsonb DEFAULT NULL,_version_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doc public.cms_documents%ROWTYPE; snapshot jsonb; cfg jsonb; target uuid; revision bigint; existed boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF _key IS NULL OR _key NOT IN ('storefront_v2_esim','storefront_v2_lounge','storefront_v2_vignette','storefront_global','storefront_esim','storefront_lounge','storefront_theme') OR _action IS NULL OR _action NOT IN ('draft','publish','restore','discard') THEN RAISE EXCEPTION 'Invalid operation' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_key,0));
 SELECT * INTO doc FROM public.cms_documents WHERE key=_key FOR UPDATE;existed:=FOUND;
 IF (existed AND (_expected_revision IS NULL OR doc.builder_revision<>_expected_revision)) OR (NOT existed AND _expected_revision IS NOT NULL) THEN RAISE EXCEPTION 'Stale editor' USING ERRCODE='PT409'; END IF;
 IF _action='restore' THEN
  SELECT v.snapshot INTO snapshot FROM public.cms_versions v WHERE v.id=_version_id AND v.document_id=doc.id;
  IF snapshot IS NULL OR (snapshot ? 'key' AND snapshot->>'key' IS DISTINCT FROM _key) THEN RAISE EXCEPTION 'Invalid version' USING ERRCODE='22023'; END IF;
  cfg:=coalesce(snapshot->'config',CASE WHEN _key='storefront_theme' THEN snapshot->'theme' ELSE NULL END);
 ELSIF _action='discard' THEN cfg:=coalesce(nullif(doc.data->'published','null'::jsonb),_config);
 ELSE cfg:=_config;END IF;
 IF cfg IS NULL OR jsonb_typeof(cfg) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid config' USING ERRCODE='22023';END IF;
 IF _key LIKE 'storefront_v2_%' AND (cfg->>'page' IS DISTINCT FROM substring(_key from 15) OR jsonb_typeof(cfg->'sections') IS DISTINCT FROM 'array') THEN RAISE EXCEPTION 'Invalid page' USING ERRCODE='22023'; END IF;
 IF NOT existed THEN INSERT INTO public.cms_documents(key,kind,status,visible,data) VALUES(_key,CASE WHEN _key='storefront_theme' THEN 'THEME' ELSE 'V2_STOREFRONT' END,'DRAFT',_key<>'storefront_theme',jsonb_build_object('draft',cfg,'published',NULL)) RETURNING id INTO target; ELSE target:=doc.id; END IF;
 IF _action='publish' THEN UPDATE public.cms_documents SET data=jsonb_build_object('draft',cfg,'published',cfg),status='PUBLISHED',published_at=now() WHERE id=target RETURNING builder_revision INTO revision;
 ELSIF existed THEN UPDATE public.cms_documents SET data=jsonb_set(data,'{draft}',cfg) WHERE id=target RETURNING builder_revision INTO revision;
 ELSE SELECT builder_revision INTO revision FROM public.cms_documents WHERE id=target; END IF;
 IF _key='storefront_theme' THEN
  INSERT INTO public.theme_settings(id,draft,published,updated_by,published_at) VALUES('active',cfg,CASE WHEN _action='publish' THEN cfg ELSE coalesce(doc.data->'published','{}') END,auth.uid(),CASE WHEN _action='publish' THEN now() ELSE doc.published_at END)
  ON CONFLICT(id) DO UPDATE SET draft=excluded.draft,published=CASE WHEN _action='publish' THEN cfg ELSE public.theme_settings.published END,published_at=CASE WHEN _action='publish' THEN now() ELSE public.theme_settings.published_at END,updated_by=auth.uid();
 END IF;
 INSERT INTO public.cms_versions(document_id,created_by,snapshot) VALUES(target,auth.uid(),jsonb_build_object('key',_key,'config',cfg,'event',_action,'revision',revision));
 PERFORM public.log_admin_action('builder.'||_action,'builder',target::text,NULL,jsonb_build_object('key',_key,'revision',revision));
 RETURN jsonb_build_object('id',target,'revision',revision);
END; $$;
REVOKE ALL ON FUNCTION pasaport_cms_private.builder_write(text,bigint,text,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION pasaport_cms_private.builder_write(text,bigint,text,jsonb,uuid) TO authenticated;
CREATE FUNCTION public.builder_write(_key text,_expected_revision bigint,_action text,_config jsonb DEFAULT NULL,_version_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT pasaport_cms_private.builder_write(_key,_expected_revision,_action,_config,_version_id); $$;
REVOKE ALL ON FUNCTION public.builder_write(text,bigint,text,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.builder_write(text,bigint,text,jsonb,uuid) TO authenticated;
-- Copy existing theme state into the same version/revision boundary without destroying legacy history.
INSERT INTO public.cms_documents(key,kind,status,visible,data,published_at)
 SELECT 'storefront_theme','THEME','DRAFT',false,jsonb_build_object('draft',draft,'published',published),published_at FROM public.theme_settings WHERE id='active'
 ON CONFLICT(key) DO UPDATE SET data=excluded.data,published_at=excluded.published_at;
ROLLBACK;
