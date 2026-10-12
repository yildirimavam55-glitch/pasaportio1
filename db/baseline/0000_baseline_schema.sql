-- Baseline: reconstructed from the live database structure (public schema,
-- functions, triggers, indexes, constraints, RLS policies and privileges).
-- On the existing database this is a no-op: it runs only when the schema is
-- absent, so it never drops, recreates or rewrites existing tables or data.
DO $pasaport_guard$
BEGIN
  IF to_regclass('public.service_products') IS NOT NULL THEN
    RAISE NOTICE 'baseline skipped: schema already present';
    RETURN;
  END IF;
  PERFORM set_config('check_function_bodies', 'false', true);
  EXECUTE $pasaport_baseline$
CREATE SCHEMA IF NOT EXISTS public;

COMMENT ON SCHEMA public IS 'standard public schema';

CREATE TYPE public.alert_status AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED'
);

CREATE TYPE public.alert_type AS ENUM (
    'PAID_NOT_FULFILLED',
    'PROVIDER_ERROR',
    'PROVISIONING_DELAYED',
    'WEBHOOK_FAILED',
    'QR_DELIVERY_FAILED',
    'VOUCHER_DELIVERY_FAILED',
    'CATALOGUE_SYNC_FAILED',
    'CATALOGUE_STALE',
    'LOW_PROVIDER_BALANCE',
    'MARGIN_BELOW_MINIMUM',
    'REFUND_REQUEST',
    'CATALOGUE_DROP_BLOCKED',
    'SUPPLIER_RESULT_UNKNOWN'
);

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'customer'
);

CREATE TYPE public.attribution_source AS ENUM (
    'GOOGLE_ADS',
    'META',
    'TIKTOK',
    'GOOGLE_ORGANIC',
    'DIRECT',
    'CRM',
    'EMAIL',
    'WHATSAPP',
    'AFFILIATE',
    'PARTNER',
    'UNKNOWN'
);

CREATE TYPE public.content_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'REVIEW',
    'ARCHIVED'
);

CREATE TYPE public.fulfillment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'FULFILLED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE public.locale_code AS ENUM (
    'tr',
    'de',
    'en'
);

CREATE TYPE public.order_status AS ENUM (
    'DRAFT',
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED'
);

CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'PAID',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
    'CHARGEBACK'
);

CREATE TYPE public.pricing_strategy AS ENUM (
    'MANUAL',
    'MARKUP_PERCENT',
    'FIXED_MARKUP',
    'MINIMUM_MARGIN'
);

CREATE TYPE public.product_lifecycle AS ENUM (
    'IMPORTED',
    'DRAFT',
    'READY',
    'PUBLISHED',
    'PAUSED',
    'UNAVAILABLE',
    'ARCHIVED'
);

CREATE TYPE public.provider_capability AS ENUM (
    'CATALOGUE',
    'REAL_TIME_AVAILABILITY',
    'ORDER',
    'CANCEL',
    'REFUND',
    'QR_OR_VOUCHER',
    'USAGE',
    'TOPUP',
    'WEBHOOKS',
    'BALANCE'
);

CREATE TYPE public.provisioning_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'PROVISIONED',
    'FAILED',
    'RESULT_UNKNOWN',
    'CANCELLED'
);

CREATE TYPE public.refund_status AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'PROCESSED',
    'UNDER_REVIEW',
    'REFUNDED',
    'CANCELLED'
);

CREATE TYPE public.service_type AS ENUM (
    'ESIM',
    'LOUNGE',
    'CAR_RENTAL',
    'TRANSFER',
    'VIGNETTE'
);

CREATE TYPE public.sync_status AS ENUM (
    'PENDING',
    'RUNNING',
    'SUCCESS',
    'PARTIAL',
    'FAILED',
    'CANCELLED',
    'SUCCESS_WITH_WARNINGS'
);

CREATE TYPE public.sync_trigger AS ENUM (
    'SCHEDULED',
    'MANUAL',
    'WEBHOOK'
);

CREATE TYPE public.traveler_relation AS ENUM (
    'SELF',
    'PARTNER',
    'CHILD',
    'OTHER'
);

CREATE FUNCTION public.accept_admin_invitation() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_user uuid; v_email text; v_verified boolean; v_id uuid;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('result', 'NO_SESSION');
  END IF;
  SELECT lower(u.email), (u.email_confirmed_at IS NOT NULL) INTO v_email, v_verified
    FROM auth.users u WHERE u.id = v_user;
  IF v_email IS NULL OR NOT v_verified THEN
    RETURN jsonb_build_object('result', 'NOT_VERIFIED');
  END IF;

  SELECT id INTO v_id FROM public.admin_invitations
    WHERE email = v_email AND status = 'PENDING' AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('result', 'NONE');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'admin') ON CONFLICT DO NOTHING;
  UPDATE public.admin_invitations
    SET status = 'ACCEPTED', accepted_at = now(), accepted_user_id = v_user, updated_at = now()
    WHERE id = v_id;
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, after_data)
    VALUES (v_user, 'ADMIN_INVITE_ACCEPTED', 'admin_invitations', v_id::text,
            jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('result', 'ACCEPTED');
END;
$$;

CREATE FUNCTION public.cancel_admin_invitation(_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.';
  END IF;
  UPDATE public.admin_invitations SET status = 'CANCELLED', updated_at = now()
    WHERE id = _id AND status = 'PENDING' RETURNING email INTO v_email;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Bekleyen davet bulunamadi.';
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, after_data)
    VALUES (auth.uid(), 'ADMIN_INVITE_CANCELLED', 'admin_invitations', _id::text,
            jsonb_build_object('email', v_email));
END;
$$;

CREATE FUNCTION public.consume_rate_limit(_bucket text, _limit integer, _window_seconds integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_start timestamptz; v_hits integer;
BEGIN
  v_start := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
  INSERT INTO public.security_rate_limits (bucket, window_start, hits) VALUES (_bucket, v_start, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = security_rate_limits.hits + 1
  RETURNING hits INTO v_hits;
  IF random() < 0.01 THEN
    DELETE FROM public.security_rate_limits WHERE window_start < now() - interval '2 days';
  END IF;
  RETURN v_hits <= _limit;
END $$;

CREATE FUNCTION public.esim_plan_tier(_groups jsonb) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN _groups IS NULL OR jsonb_typeof(_groups) <> 'array' THEN NULL
    ELSE (
      SELECT CASE
        WHEN t NOT LIKE '%unlimited%' THEN NULL
        WHEN t LIKE '%plus%' THEN 'PLUS'
        WHEN t LIKE '%essential%' THEN 'ESSENTIAL'
        WHEN t LIKE '%lite%' THEN 'LITE'
        ELSE NULL END
      FROM (SELECT lower(coalesce(string_agg(e, ' '), '')) AS t FROM jsonb_array_elements_text(_groups) e) s
    ) END
$$;

CREATE FUNCTION public.guard_refund_request() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE f text := OLD.status::text; t text := NEW.status::text;
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.order_item_id IS DISTINCT FROM OLD.order_item_id
     OR NEW.customer_esim_id IS DISTINCT FROM OLD.customer_esim_id
     OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
     OR NEW.purchase_at IS DISTINCT FROM OLD.purchase_at
     OR NEW.window_ends_at IS DISTINCT FROM OLD.window_ends_at
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.list_amount IS DISTINCT FROM OLD.list_amount
     OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
     OR NEW.amount_basis IS DISTINCT FROM OLD.amount_basis
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.reason_code IS DISTINCT FROM OLD.reason_code
     OR NEW.is_test IS DISTINCT FROM OLD.is_test
     OR NEW.product_snapshot IS DISTINCT FROM OLD.product_snapshot
     OR NEW.usage_verification IS DISTINCT FROM OLD.usage_verification
     OR NEW.usage_snapshot IS DISTINCT FROM OLD.usage_snapshot
     OR NEW.eligibility IS DISTINCT FROM OLD.eligibility
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Refund request snapshot fields are immutable.';
  END IF;
  IF t <> f THEN
    IF t = 'REFUNDED' THEN
      IF f <> 'APPROVED' OR coalesce(current_setting('travely.payment_refund_confirmed', true), '') <> 'true' THEN
        RAISE EXCEPTION 'REFUNDED requires an approved request and a confirmed payment-provider refund.';
      END IF;
    ELSIF NOT (
      (f = 'REQUESTED' AND t IN ('UNDER_REVIEW','APPROVED','REJECTED','CANCELLED')) OR
      (f = 'UNDER_REVIEW' AND t IN ('APPROVED','REJECTED','CANCELLED')) OR
      (f = 'APPROVED' AND t = 'CANCELLED')
    ) THEN
      RAISE EXCEPTION 'Refund status transition % -> % is not allowed.', f, t;
    END IF;
  END IF;
  NEW.is_open = t IN ('REQUESTED','UNDER_REVIEW','APPROVED');
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE FUNCTION public.guard_refund_request_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status::text = 'REFUNDED' AND coalesce(current_setting('travely.payment_refund_confirmed', true), '') <> 'true' THEN
    RAISE EXCEPTION 'REFUNDED requires an approved request and a confirmed payment-provider refund.';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict do nothing;
  return new;
end $$;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case
    when _user_id is not null and (_user_id = auth.uid() or coalesce(auth.role(), '') = 'service_role')
      then exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
    else false
  end
$$;

CREATE FUNCTION public.invite_admin(_email text, _note text, _token_hash text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE v_email text; v_user uuid; v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.';
  END IF;
  v_email := lower(trim(_email));
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Gecerli bir e-posta adresi girin.';
  END IF;

  SELECT id INTO v_user FROM auth.users WHERE lower(email) = v_email LIMIT 1;

  IF v_user IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role = 'admin') THEN
      RETURN jsonb_build_object('result', 'ALREADY_ADMIN');
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'admin')
      ON CONFLICT DO NOTHING;
    UPDATE public.admin_invitations
      SET status = 'ACCEPTED', accepted_at = now(), accepted_user_id = v_user
      WHERE email = v_email AND status = 'PENDING';
    INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, after_data)
      VALUES (auth.uid(), 'ADMIN_GRANTED', 'user_roles', v_user::text,
              jsonb_build_object('email', v_email, 'note', _note));
    RETURN jsonb_build_object('result', 'GRANTED', 'userId', v_user);
  END IF;

  INSERT INTO public.admin_invitations (email, note, token_hash, invited_by)
  VALUES (v_email, NULLIF(trim(coalesce(_note, '')), ''), _token_hash, auth.uid())
  ON CONFLICT (email) WHERE status = 'PENDING'
  DO UPDATE SET token_hash = EXCLUDED.token_hash,
                note = EXCLUDED.note,
                expires_at = now() + interval '14 days',
                invited_by = EXCLUDED.invited_by,
                updated_at = now()
  RETURNING id INTO v_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, after_data)
    VALUES (auth.uid(), 'ADMIN_INVITED', 'admin_invitations', v_id::text,
            jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('result', 'PENDING', 'invitationId', v_id);
END;
$_$;

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.has_role(auth.uid(), 'admin')
$$;

CREATE FUNCTION public.list_admin_users() RETURNS TABLE(user_id uuid, email text, full_name text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, email_confirmed boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.';
  END IF;
  RETURN QUERY
  SELECT u.id,
         COALESCE(p.email, u.email)::text,
         p.full_name,
         r.created_at,
         u.last_sign_in_at,
         (u.email_confirmed_at IS NOT NULL)
  FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.role = 'admin'
  ORDER BY r.created_at;
END;
$$;

CREATE FUNCTION public.log_admin_action(_action text, _entity_type text, _entity_id text, _before jsonb, _after jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.';
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _before, _after)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.public_platform_settings(_id text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case
    when _id = 'active' then jsonb_strip_nulls(jsonb_build_object(
      'brandName', s.data->'brandName',
      'supportEmail', s.data->'supportEmail',
      'supportUrl', s.data->'supportUrl',
      'maintenance', s.data->'maintenance',
      'whatsappWidget', s.data->'whatsappWidget',
      'refundTrust', s.data->'refundTrust'))
    when _id = 'seo' then jsonb_strip_nulls(jsonb_build_object(
      'organizationName', s.data->'organizationName',
      'defaultOgImage', s.data->'defaultOgImage',
      'twitterHandle', s.data->'twitterHandle',
      'hubs', s.data->'hubs'))
    else null
  end
  from public.platform_settings s where s.id = _id and _id in ('active', 'seo')
$$;

CREATE FUNCTION public.public_promotion_banner() RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric, currency text, banner_text jsonb, show_code boolean, show_copy boolean, ends_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.id, CASE WHEN p.banner_show_code THEN p.code ELSE NULL END, p.discount_type, p.discount_value, p.currency,
         p.banner_text, p.banner_show_code, p.banner_show_copy, p.ends_at
  FROM public.promotions p
  WHERE p.status = 'ACTIVE' AND p.banner_visible AND p.starts_at <= now() AND p.ends_at > now()
  ORDER BY p.starts_at DESC LIMIT 1
$$;

CREATE FUNCTION public.refresh_admin_invitation(_id uuid, _token_hash text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.';
  END IF;
  UPDATE public.admin_invitations
    SET token_hash = _token_hash, expires_at = now() + interval '14 days', updated_at = now()
    WHERE id = _id AND status = 'PENDING' RETURNING email INTO v_email;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Bekleyen davet bulunamadi.';
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, after_data)
    VALUES (auth.uid(), 'ADMIN_INVITED', 'admin_invitations', _id::text,
            jsonb_build_object('email', v_email, 'resent', true));
END;
$$;

CREATE FUNCTION public.refund_events_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN RAISE EXCEPTION 'Refund events are append-only.'; END $$;

CREATE FUNCTION public.refund_request_force_initial_state() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.status := 'REQUESTED';
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.requested_by := auth.uid();
    NEW.amount := NULL; NEW.list_amount := NULL; NEW.discount_amount := 0;
    NEW.amount_basis := jsonb_build_object('source', 'untrusted_client_ignored');
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.refund_request_set_open() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.is_open = NEW.status::text IN ('REQUESTED','UNDER_REVIEW','APPROVED');
  RETURN NEW;
END $$;

CREATE FUNCTION public.revoke_admin(_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.';
  END IF;
  SELECT count(*) INTO v_count FROM public.user_roles WHERE role = 'admin';
  IF v_count <= 1 THEN
    RAISE EXCEPTION 'En az bir aktif yonetici hesabi bulunmalidir.';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before_data)
    VALUES (auth.uid(), 'ADMIN_REVOKED', 'user_roles', _user_id::text,
            jsonb_build_object('userId', _user_id));
END;
$$;

CREATE FUNCTION public.security_baseline_status() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  protected text[] := ARRAY['profiles','orders','order_items','customer_esims','refund_requests','refund_request_events','payment_transactions','travelers','user_roles','provisioning_units','customer_trips','customer_lounge_bookings','admin_audit_log','provider_connections','security_rate_limits'];
  v_rls_off int; v_cost_exposed boolean; v_role_write boolean; v_rl boolean; v_esim_anon boolean;
  v_role_lookup boolean; v_settings_private boolean;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Yonetici yetkisi gerekiyor.'; END IF;
  SELECT count(*) INTO v_rls_off FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY(protected) AND NOT c.relrowsecurity;
  v_cost_exposed := has_column_privilege('anon','public.service_products','provider_cost','SELECT')
    OR has_column_privilege('authenticated','public.service_products','provider_cost','SELECT')
    OR has_column_privilege('anon','public.esim_product_details','provider_metadata','SELECT')
    OR has_column_privilege('authenticated','public.esim_product_details','provider_metadata','SELECT');
  v_role_write := EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles'
    AND cmd IN ('INSERT','UPDATE','ALL','DELETE') AND coalesce(qual,'') NOT ILIKE '%is_admin%' AND coalesce(with_check,'') NOT ILIKE '%is_admin%');
  v_rl := to_regprocedure('public.consume_rate_limit(text,integer,integer)') IS NOT NULL
    AND NOT has_function_privilege('anon','public.consume_rate_limit(text,integer,integer)','EXECUTE')
    AND NOT has_function_privilege('authenticated','public.consume_rate_limit(text,integer,integer)','EXECUTE');
  v_esim_anon := EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customer_esims' AND 'anon' = ANY(roles));
  v_role_lookup := NOT has_function_privilege('anon','public.has_role(uuid,public.app_role)','EXECUTE')
    AND (SELECT prosrc FROM pg_proc WHERE oid = 'public.has_role(uuid,public.app_role)'::regprocedure) ILIKE '%_user_id = auth.uid()%';
  v_settings_private := NOT has_table_privilege('anon','public.platform_settings','SELECT')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_settings'
      AND cmd IN ('SELECT','ALL') AND coalesce(qual,'') NOT ILIKE '%is_admin%');
  RETURN jsonb_build_object(
    'databaseProtection', v_rls_off = 0,
    'customerIsolation', v_rls_off = 0 AND NOT v_esim_anon,
    'supplierCostProtection', NOT v_cost_exposed,
    'roleProtection', NOT v_role_write,
    'rateLimiting', v_rl,
    'roleLookupSelfOnly', v_role_lookup,
    'settingsTablePrivate', v_settings_private,
    'checkedAt', now());
END $$;

CREATE FUNCTION public.storefront_country_starting_prices(_isos text[] DEFAULT NULL::text[], _show_test boolean DEFAULT false) RETURNS TABLE(iso text, amount numeric, currency text)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $_$
  SELECT DISTINCT ON (upper(d.country_iso)) upper(d.country_iso), p.sale_price, coalesce(p.currency, 'EUR')
  FROM public.service_products p
  JOIN public.esim_product_details d ON d.product_id = p.id
  WHERE p.service_type = 'ESIM' AND p.lifecycle = 'PUBLISHED' AND p.customer_visible
    AND p.provider_available AND p.margin_flagged = false AND p.sale_price > 0
    AND (_show_test OR p.is_test IS NOT TRUE)
    AND d.package_kind = 'COUNTRY'
    AND upper(d.country_iso) ~ '^[A-Z]{2}$'
    AND (_isos IS NULL OR d.country_iso = ANY(_isos))
    AND NOT (coalesce(d.unlimited_data, false) AND coalesce(public.esim_plan_tier(d.supplier_groups), '') IN ('LITE','PLUS'))
  ORDER BY upper(d.country_iso), p.sale_price, p.id
$_$;

CREATE FUNCTION public.storefront_regional_package_rows(_show_test boolean DEFAULT false) RETURNS TABLE(sale_price numeric, currency text, country_iso text, package_kind text, unlimited boolean, data_gb numeric, validity_days integer, coverage text[], network_operators text[], supplier_speed jsonb)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  WITH base AS (
    SELECT p.id, p.sort_order, p.sale_price, coalesce(p.currency, 'EUR') AS currency,
      upper(d.country_iso) AS country_iso, d.package_kind,
      (d.data_type = 'UNLIMITED' OR coalesce(d.unlimited_data, false)) AS unlimited,
      d.data_gb, d.validity_days, d.network_operators, d.supplier_speed,
      CASE WHEN (d.data_type = 'UNLIMITED' OR coalesce(d.unlimited_data, false)) THEN public.esim_plan_tier(d.supplier_groups) END AS tier,
      ARRAY(SELECT DISTINCT upper(x) FROM unnest(coalesce(d.coverage_country_isos, '{}') || CASE WHEN d.country_iso IS NULL THEN '{}'::text[] ELSE ARRAY[d.country_iso] END) x ORDER BY 1) AS coverage
    FROM public.service_products p
    JOIN public.esim_product_details d ON d.product_id = p.id
    WHERE p.service_type = 'ESIM' AND p.lifecycle = 'PUBLISHED' AND p.customer_visible
      AND p.provider_available AND p.margin_flagged = false AND p.sale_price > 0
      AND (_show_test OR p.is_test IS NOT TRUE)
      AND upper(coalesce(d.package_kind, '')) NOT IN ('COUNTRY','LOCAL','SUBDIVISION','STATE','PROVINCE')
  ), multi AS (SELECT * FROM base WHERE cardinality(coverage) >= 2)
  SELECT m.sale_price, m.currency, m.country_iso, m.package_kind, m.unlimited, m.data_gb, m.validity_days,
    m.coverage, m.network_operators, m.supplier_speed
  FROM multi m
  WHERE NOT (m.unlimited AND coalesce(m.tier, '') <> 'ESSENTIAL' AND EXISTS (
    SELECT 1 FROM multi e WHERE e.unlimited AND e.tier = 'ESSENTIAL'
      AND e.coverage = m.coverage AND e.validity_days IS NOT DISTINCT FROM m.validity_days))
  ORDER BY m.sort_order, m.id
$$;

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin new.updated_at = now(); return new; end $$;

CREATE TABLE public.account_deletion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'REQUESTED'::text NOT NULL,
    reason text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_deletion_requests_status_check CHECK ((status = ANY (ARRAY['REQUESTED'::text, 'IN_REVIEW'::text, 'COMPLETED'::text, 'REJECTED'::text, 'CANCELLED'::text])))
);

CREATE TABLE public.admin_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id text,
    before_data jsonb,
    after_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.admin_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    note text,
    token_hash text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    invited_by uuid,
    accepted_at timestamp with time zone,
    accepted_user_id uuid,
    delivery_state text DEFAULT 'NOT_SENT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.airport_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    airport_id uuid NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    customer_visible boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    media_id uuid,
    mobile_media_id uuid,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.airports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    iata text NOT NULL,
    icao text,
    name text NOT NULL,
    city text,
    timezone text,
    country_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    session_id text,
    customer_id uuid,
    service_type public.service_type,
    locale public.locale_code,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    service_type public.service_type,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    active boolean DEFAULT false NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    cta_href text DEFAULT '/'::text NOT NULL,
    media_id uuid,
    mobile_media_id uuid,
    destination_id uuid,
    airport_id uuid,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.canonical_destinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    canonical_code text NOT NULL,
    provider_code text,
    display_name text NOT NULL,
    parent_country_iso text,
    type text DEFAULT 'COUNTRY'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    has_sellable_products boolean DEFAULT false NOT NULL,
    sellable_product_count integer DEFAULT 0 NOT NULL,
    refreshed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cms_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    kind text DEFAULT 'PAGE'::text NOT NULL,
    status public.content_status DEFAULT 'DRAFT'::public.content_status NOT NULL,
    published_at timestamp with time zone,
    scheduled_at timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cms_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    locale public.locale_code NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.cms_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    snapshot jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    iso2 text NOT NULL,
    iso3 text,
    name text NOT NULL,
    region_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.customer_esims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    order_item_id uuid,
    traveler_label text,
    destination_label text,
    package_label text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    total_data_mb bigint,
    remaining_data_mb bigint,
    expires_at timestamp with time zone,
    iccid text,
    qr_payload text,
    install_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    topup_supported boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_reference text
);

CREATE TABLE public.customer_lounge_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    order_item_id uuid,
    airport_iata text,
    terminal text,
    lounge_name text,
    visit_at timestamp with time zone,
    travelers_count integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    booking_reference text,
    voucher_payload text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.customer_notification_preferences (
    user_id uuid NOT NULL,
    marketing_email boolean DEFAULT false NOT NULL,
    product_tips_email boolean DEFAULT false NOT NULL,
    consent_updated_at timestamp with time zone,
    consent_source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.customer_trip_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    order_item_id uuid,
    service_type public.service_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.customer_trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    title text NOT NULL,
    destination_id uuid,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.destination_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_id uuid NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    customer_visible boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    media_id uuid,
    mobile_media_id uuid,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.destinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    kind text DEFAULT 'COUNTRY'::text NOT NULL,
    country_id uuid,
    region_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.esim_device_compatibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand text NOT NULL,
    family text,
    model text NOT NULL,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    status text NOT NULL,
    notes text,
    region_variant_warning boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_reviewed date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT esim_device_compatibility_status_check CHECK ((status = ANY (ARRAY['COMPATIBLE'::text, 'UNCERTAIN'::text, 'NOT_COMPATIBLE'::text])))
);

CREATE TABLE public.esim_product_details (
    product_id uuid NOT NULL,
    country_id uuid,
    country_iso text,
    region_id uuid,
    coverage_country_isos text[] DEFAULT '{}'::text[] NOT NULL,
    package_kind text DEFAULT 'COUNTRY'::text NOT NULL,
    data_gb numeric(10,2),
    unlimited_data boolean DEFAULT false NOT NULL,
    validity_days integer,
    provider_bundle_id text,
    network_operators text[] DEFAULT '{}'::text[] NOT NULL,
    supports_5g boolean,
    supports_hotspot boolean,
    data_only boolean,
    activation_policy text,
    validity_start_rule text,
    apn_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    topup_supported boolean,
    provider_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_validity_value numeric,
    raw_validity_unit text,
    data_type text DEFAULT 'FIXED'::text NOT NULL,
    fair_use_note text,
    fair_use_policy text,
    high_speed_allowance text,
    speed_after_fair_use text,
    coverage_subdivision_codes text[] DEFAULT '{}'::text[] NOT NULL,
    unlimited_details_complete boolean,
    metadata_provenance jsonb DEFAULT '{}'::jsonb NOT NULL,
    supplier_groups jsonb GENERATED ALWAYS AS ((provider_metadata -> 'groups'::text)) STORED,
    supplier_speed jsonb GENERATED ALWAYS AS ((provider_metadata -> 'speed'::text)) STORED,
    supplier_countries jsonb GENERATED ALWAYS AS ((provider_metadata -> 'countries'::text)) STORED,
    CONSTRAINT esim_product_details_activation_policy_check CHECK (((activation_policy IS NULL) OR (activation_policy = ANY (ARRAY['ON_INSTALL'::text, 'ON_FIRST_NETWORK_CONNECTION'::text, 'ON_PURCHASE'::text, 'UNKNOWN'::text])))),
    CONSTRAINT esim_product_details_data_type_check CHECK ((data_type = ANY (ARRAY['FIXED'::text, 'UNLIMITED'::text])))
);

CREATE TABLE public.esim_usage_settings (
    id text DEFAULT 'default'::text NOT NULL,
    config jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_currency text NOT NULL,
    quote_currency text NOT NULL,
    rate numeric(16,8) NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.feature_flags (
    key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    description text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.guide_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    icon text DEFAULT 'compass'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    labels jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.guide_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guide_id uuid NOT NULL,
    relation_type text NOT NULL,
    country_iso text,
    region_id uuid,
    city_name text,
    airport_iata text,
    route_id uuid,
    service_type public.service_type,
    product_id uuid,
    cta_enabled boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT guide_relations_relation_type_check CHECK ((relation_type = ANY (ARRAY['COUNTRY'::text, 'REGION'::text, 'CITY'::text, 'AIRPORT'::text, 'ROUTE'::text, 'SERVICE'::text, 'PRODUCT'::text])))
);

CREATE TABLE public.guide_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    country_isos text[] DEFAULT '{}'::text[] NOT NULL,
    labels jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.guide_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guide_id uuid NOT NULL,
    locale public.locale_code NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    intro text,
    sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    faq jsonb DEFAULT '[]'::jsonb NOT NULL,
    seo_title text,
    seo_description text,
    translation_status public.content_status DEFAULT 'DRAFT'::public.content_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    h1 text,
    hero_alt text,
    city_facts jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.guides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    category_id uuid,
    content_type text DEFAULT 'GUIDE'::text NOT NULL,
    status public.content_status DEFAULT 'DRAFT'::public.content_status NOT NULL,
    published_at timestamp with time zone,
    featured boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    hero_media_id uuid,
    hero_image_url text,
    hero_alt text,
    reading_minutes integer,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    country_iso text,
    city_name text,
    author_id uuid,
    indexable boolean DEFAULT true NOT NULL,
    canonical_override text,
    related_guide_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    related_product_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    rel_service text DEFAULT 'GENERAL'::text NOT NULL,
    rel_type text DEFAULT 'GENERAL'::text NOT NULL,
    rel_region text,
    rel_airport text,
    rel_commercial_page text,
    rel_esim_destination text,
    rel_lounge text,
    rel_vignette text,
    show_on_commercial boolean DEFAULT true NOT NULL,
    auto_relation boolean DEFAULT true NOT NULL,
    display_priority integer DEFAULT 0 NOT NULL,
    concept_key text,
    CONSTRAINT guides_content_type_check CHECK ((content_type = ANY (ARRAY['GUIDE'::text, 'DESTINATION'::text, 'HOW_TO'::text, 'COMPARISON'::text, 'ROAD_TRIP'::text, 'AIRPORT_GUIDE'::text, 'VIGNETTE_GUIDE'::text, 'CITY'::text, 'ARTICLE'::text]))),
    CONSTRAINT guides_rel_service_check CHECK ((rel_service = ANY (ARRAY['ESIM'::text, 'LOUNGE'::text, 'VIGNETTE'::text, 'GENERAL'::text]))),
    CONSTRAINT guides_rel_type_check CHECK ((rel_type = ANY (ARRAY['COUNTRY'::text, 'CITY'::text, 'REGION'::text, 'AIRPORT'::text, 'ROUTE'::text, 'GENERAL'::text])))
);

CREATE TABLE public.idempotency_keys (
    key text NOT NULL,
    scope text NOT NULL,
    status text DEFAULT 'IN_PROGRESS'::text NOT NULL,
    response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);

CREATE TABLE public.lounge_product_details (
    product_id uuid NOT NULL,
    airport_id uuid,
    iata text,
    terminal text,
    lounge_name text,
    airside boolean,
    departure_eligible boolean,
    transit_eligible boolean,
    arrival_eligible boolean,
    opening_hours jsonb DEFAULT '{}'::jsonb NOT NULL,
    timezone text,
    max_stay_minutes integer,
    amenities text[] DEFAULT '{}'::text[] NOT NULL,
    adult_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    child_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    minimum_age integer,
    booking_window_hours integer,
    boarding_pass_required boolean,
    cancellation_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    voucher_required boolean,
    provider_lounge_id text,
    provider_metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    category text DEFAULT 'GLOBAL'::text NOT NULL,
    usage text DEFAULT 'BOTH'::text NOT NULL,
    alt_text text DEFAULT ''::text NOT NULL,
    focal_x numeric DEFAULT 50 NOT NULL,
    focal_y numeric DEFAULT 50 NOT NULL,
    mime_type text,
    size_bytes bigint,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    width integer,
    height integer,
    CONSTRAINT media_assets_category_check CHECK ((category = ANY (ARRAY['GLOBAL'::text, 'ESIM'::text, 'LOUNGE'::text, 'HERO'::text, 'DESTINATION'::text, 'AIRPORT'::text, 'CAMPAIGN'::text, 'CROSS_SELL'::text]))),
    CONSTRAINT media_assets_usage_check CHECK ((usage = ANY (ARRAY['DESKTOP'::text, 'MOBILE'::text, 'BOTH'::text])))
);

CREATE TABLE public.ops_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type public.alert_type NOT NULL,
    status public.alert_status DEFAULT 'OPEN'::public.alert_status NOT NULL,
    severity text DEFAULT 'WARNING'::text NOT NULL,
    entity_type text,
    entity_id uuid,
    message text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    service_type public.service_type NOT NULL,
    product_id uuid,
    provider_id uuid,
    traveler_id uuid,
    product_name_snapshot text NOT NULL,
    product_slug_snapshot text,
    sale_price numeric(12,4) DEFAULT 0 NOT NULL,
    provider_cost numeric(12,4) DEFAULT 0 NOT NULL,
    discount numeric(12,4) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    destination_snapshot text,
    airport_iata_snapshot text,
    fulfillment_status public.fulfillment_status DEFAULT 'PENDING'::public.fulfillment_status NOT NULL,
    provider_reference text,
    details_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id uuid,
    guest_email text,
    guest_claim_token text,
    trip_id uuid,
    status public.order_status DEFAULT 'DRAFT'::public.order_status NOT NULL,
    payment_status public.payment_status DEFAULT 'PENDING'::public.payment_status NOT NULL,
    fulfillment_status public.fulfillment_status DEFAULT 'PENDING'::public.fulfillment_status NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    gross_revenue numeric(12,4) DEFAULT 0 NOT NULL,
    discount_total numeric(12,4) DEFAULT 0 NOT NULL,
    tax_total numeric(12,4) DEFAULT 0 NOT NULL,
    payment_fee numeric(12,4) DEFAULT 0 NOT NULL,
    provider_cost_total numeric(12,4) DEFAULT 0 NOT NULL,
    refunded_total numeric(12,4) DEFAULT 0 NOT NULL,
    fx_rate_to_eur numeric(16,8),
    locale public.locale_code DEFAULT 'tr'::public.locale_code NOT NULL,
    customer_country_iso text,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    promotion_id uuid,
    coupon_code text,
    discount_type text,
    discount_value numeric(12,2),
    original_subtotal numeric(12,4),
    final_subtotal numeric(12,4)
);

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    psp text,
    psp_transaction_id text,
    kind text DEFAULT 'PAYMENT'::text NOT NULL,
    status public.payment_status DEFAULT 'PENDING'::public.payment_status NOT NULL,
    amount numeric(12,4) DEFAULT 0 NOT NULL,
    fee numeric(12,4) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    payout_reference text,
    raw jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.platform_settings (
    id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.pricing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    service_type public.service_type,
    provider_id uuid,
    strategy public.pricing_strategy DEFAULT 'MARKUP_PERCENT'::public.pricing_strategy NOT NULL,
    markup_percent numeric(6,2),
    fixed_markup numeric(12,4),
    minimum_margin_percent numeric(6,2),
    rounding_mode text DEFAULT 'NONE'::text NOT NULL,
    rounding_ending numeric(6,4),
    currency text DEFAULT 'EUR'::text NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.product_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    locale public.locale_code NOT NULL,
    title text,
    short_description text,
    description text,
    seo_title text,
    seo_description text
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    preferred_locale public.locale_code DEFAULT 'tr'::public.locale_code NOT NULL,
    country_iso text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promotion_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promotion_id uuid NOT NULL,
    order_id uuid,
    customer_id uuid,
    discount_amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    status text DEFAULT 'PAUSED'::text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric(12,2) NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    services text[] DEFAULT '{ESIM}'::text[] NOT NULL,
    country_scope text DEFAULT 'ALL'::text NOT NULL,
    country_isos text[] DEFAULT '{}'::text[] NOT NULL,
    product_scope text DEFAULT 'ALL'::text NOT NULL,
    product_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    package_type text DEFAULT 'ALL'::text NOT NULL,
    package_scopes text[] DEFAULT '{COUNTRY}'::text[] NOT NULL,
    total_limit integer,
    per_customer_limit integer,
    min_order numeric(12,2),
    banner_visible boolean DEFAULT false NOT NULL,
    banner_text jsonb DEFAULT '{}'::jsonb NOT NULL,
    banner_show_code boolean DEFAULT true NOT NULL,
    banner_show_copy boolean DEFAULT true NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT promotions_code_format CHECK ((code ~ '^[A-Z0-9_-]{3,32}$'::text)),
    CONSTRAINT promotions_country_scope_check CHECK ((country_scope = ANY (ARRAY['ALL'::text, 'SELECTED'::text]))),
    CONSTRAINT promotions_discount_type_check CHECK ((discount_type = ANY (ARRAY['PERCENT'::text, 'FIXED'::text]))),
    CONSTRAINT promotions_min_order_check CHECK (((min_order IS NULL) OR (min_order >= (0)::numeric))),
    CONSTRAINT promotions_package_type_check CHECK ((package_type = ANY (ARRAY['ALL'::text, 'STANDARD'::text, 'UNLIMITED'::text]))),
    CONSTRAINT promotions_per_customer_limit_check CHECK (((per_customer_limit IS NULL) OR (per_customer_limit > 0))),
    CONSTRAINT promotions_product_scope_check CHECK ((product_scope = ANY (ARRAY['ALL'::text, 'SELECTED'::text]))),
    CONSTRAINT promotions_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'ARCHIVED'::text]))),
    CONSTRAINT promotions_total_limit_check CHECK (((total_limit IS NULL) OR (total_limit > 0))),
    CONSTRAINT promotions_value CHECK ((((discount_type = 'PERCENT'::text) AND (discount_value > (0)::numeric) AND (discount_value <= (100)::numeric)) OR ((discount_type = 'FIXED'::text) AND (discount_value > (0)::numeric)))),
    CONSTRAINT promotions_window CHECK ((ends_at > starts_at))
);

CREATE TABLE public.provider_catalogue_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    sync_run_id uuid,
    product_id uuid,
    external_id text NOT NULL,
    change_type text NOT NULL,
    needs_review boolean DEFAULT false NOT NULL,
    reviewed_at timestamp with time zone,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT provider_catalogue_changes_type_check CHECK ((change_type = ANY (ARRAY['NEW_PRODUCT'::text, 'PRICE_INCREASE'::text, 'PRICE_DECREASE'::text, 'COVERAGE_CHANGE'::text, 'VALIDITY_CHANGE'::text, 'DATA_CHANGE'::text, 'AVAILABILITY_CHANGE'::text, 'PRODUCT_REMOVED'::text, 'PRODUCT_RETURNED'::text])))
);

CREATE TABLE public.provider_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    base_url text,
    credential_secret_names text[] DEFAULT '{}'::text[] NOT NULL,
    webhook_secret_name text,
    rate_limit_per_minute integer,
    status text DEFAULT 'NOT_CONFIGURED'::text NOT NULL,
    last_checked_at timestamp with time zone,
    last_sync_at timestamp with time zone,
    sync_cron text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_success_at timestamp with time zone,
    last_attempt_at timestamp with time zone,
    next_sync_at timestamp with time zone,
    sync_state text DEFAULT 'IDLE'::text NOT NULL
);

CREATE TABLE public.provider_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    product_id uuid,
    external_id text NOT NULL,
    old_cost numeric(12,4),
    new_cost numeric(12,4) NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    change_amount numeric(12,4),
    change_percent numeric(8,2),
    sync_run_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.provider_product_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    external_id text NOT NULL,
    raw_item_id uuid,
    provider_cost numeric(12,4),
    provider_currency text DEFAULT 'EUR'::text,
    available boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    last_synced_at timestamp with time zone
);

CREATE TABLE public.provider_raw_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    external_id text NOT NULL,
    service_type public.service_type NOT NULL,
    payload jsonb NOT NULL,
    payload_hash text NOT NULL,
    available boolean DEFAULT true NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sync_run_id uuid
);

CREATE TABLE public.provider_sync_errors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_run_id uuid,
    provider_id uuid NOT NULL,
    external_id text,
    code text,
    message text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.provider_sync_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    connection_id uuid,
    trigger public.sync_trigger DEFAULT 'MANUAL'::public.sync_trigger NOT NULL,
    status public.sync_status DEFAULT 'PENDING'::public.sync_status NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    items_received integer DEFAULT 0 NOT NULL,
    items_created integer DEFAULT 0 NOT NULL,
    items_updated integer DEFAULT 0 NOT NULL,
    items_unchanged integer DEFAULT 0 NOT NULL,
    items_unavailable integer DEFAULT 0 NOT NULL,
    items_failed integer DEFAULT 0 NOT NULL,
    error_summary text,
    idempotency_key text,
    items_returned integer DEFAULT 0 NOT NULL,
    price_changes integer DEFAULT 0 NOT NULL,
    coverage_changes integer DEFAULT 0 NOT NULL,
    complete boolean DEFAULT false NOT NULL,
    checkpoint_page integer DEFAULT 0 NOT NULL,
    items_processed integer DEFAULT 0 NOT NULL,
    last_checkpoint_at timestamp with time zone,
    items_parsed integer DEFAULT 0 NOT NULL,
    items_invalid integer DEFAULT 0 NOT NULL,
    items_duplicate integer DEFAULT 0 NOT NULL,
    items_excluded integer DEFAULT 0 NOT NULL,
    warnings integer DEFAULT 0 NOT NULL,
    previous_item_count integer,
    drop_percent numeric,
    deactivation_blocked boolean DEFAULT false NOT NULL
);

CREATE TABLE public.providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    service_type public.service_type NOT NULL,
    capabilities public.provider_capability[] DEFAULT '{}'::public.provider_capability[] NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    active boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    adapter_type text DEFAULT 'GENERIC_REST'::text NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    minimum_margin_percent numeric(6,2),
    auto_sync boolean DEFAULT true NOT NULL,
    sync_interval_hours integer DEFAULT 24 NOT NULL,
    low_balance_threshold numeric(12,2),
    balance_amount numeric(12,2),
    balance_currency text,
    balance_checked_at timestamp with time zone,
    max_catalogue_drop_percent numeric DEFAULT 20 NOT NULL,
    CONSTRAINT providers_adapter_type_check CHECK ((adapter_type = ANY (ARRAY['NATIVE_ESIM_GO'::text, 'NATIVE_ESIM_ACCESS'::text, 'GENERIC_REST'::text, 'CUSTOM'::text]))),
    CONSTRAINT providers_sync_interval_check CHECK ((sync_interval_hours = ANY (ARRAY[6, 12, 24, 48])))
);

CREATE TABLE public.provisioning_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    unit_index integer NOT NULL,
    service_type public.service_type DEFAULT 'ESIM'::public.service_type NOT NULL,
    provider_id uuid,
    status public.provisioning_status DEFAULT 'PENDING'::public.provisioning_status NOT NULL,
    idempotency_key text NOT NULL,
    provider_reference text,
    provider_order_status text,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    error_category text,
    error_message text,
    customer_esim_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.refund_request_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refund_request_id uuid NOT NULL,
    actor_id uuid,
    actor_type text NOT NULL,
    event text NOT NULL,
    from_status text,
    to_status text,
    order_id uuid,
    order_item_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.refund_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    order_item_id uuid,
    status public.refund_status DEFAULT 'REQUESTED'::public.refund_status NOT NULL,
    amount numeric(12,4),
    currency text DEFAULT 'EUR'::text NOT NULL,
    reason text,
    requested_by uuid,
    decided_by uuid,
    decided_at timestamp with time zone,
    audit jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_esim_id uuid,
    purchase_at timestamp with time zone,
    window_ends_at timestamp with time zone,
    list_amount numeric,
    discount_amount numeric DEFAULT 0 NOT NULL,
    amount_basis jsonb DEFAULT '{}'::jsonb NOT NULL,
    reason_code text,
    usage_verification text DEFAULT 'UNKNOWN'::text NOT NULL,
    usage_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    eligibility text DEFAULT 'REVIEW_REQUIRED'::text NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    product_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    customer_message text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    payment_refund_reference text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_open boolean DEFAULT true NOT NULL
);

CREATE TABLE public.regions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.route_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    icon text DEFAULT 'Route'::text NOT NULL,
    countries text[] DEFAULT '{}'::text[] NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    media_id uuid,
    mobile_media_id uuid,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.security_rate_limits (
    bucket text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    hits integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.seo_authors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    bio jsonb DEFAULT '{}'::jsonb NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.service_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_type public.service_type NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    lifecycle public.product_lifecycle DEFAULT 'DRAFT'::public.product_lifecycle NOT NULL,
    primary_provider_id uuid,
    provider_external_id text,
    provider_cost numeric(12,4),
    provider_currency text DEFAULT 'EUR'::text,
    provider_available boolean DEFAULT true NOT NULL,
    provider_synced_at timestamp with time zone,
    currency text DEFAULT 'EUR'::text NOT NULL,
    sale_price numeric(12,4),
    pricing_rule_id uuid,
    price_overridden boolean DEFAULT false NOT NULL,
    customer_visible boolean DEFAULT false NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    badge text,
    sort_order integer DEFAULT 0 NOT NULL,
    margin_flagged boolean DEFAULT false NOT NULL,
    destination_id uuid,
    airport_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    source text DEFAULT 'PROVIDER'::text NOT NULL,
    pricing_review_required boolean DEFAULT false NOT NULL,
    priced_at timestamp with time zone,
    pricing_snapshot jsonb
);

CREATE TABLE public.services (
    service_type public.service_type NOT NULL,
    slug text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    customer_visible boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.theme_settings (
    id text NOT NULL,
    draft jsonb DEFAULT '{}'::jsonb NOT NULL,
    published jsonb DEFAULT '{}'::jsonb NOT NULL,
    published_at timestamp with time zone,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.traffic_attribution (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text,
    customer_id uuid,
    order_id uuid,
    first_touch_source public.attribution_source DEFAULT 'UNKNOWN'::public.attribution_source NOT NULL,
    last_touch_source public.attribution_source DEFAULT 'UNKNOWN'::public.attribution_source NOT NULL,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    landing_path text,
    captured_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.travelers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    label text NOT NULL,
    relation public.traveler_relation DEFAULT 'SELF'::public.traveler_relation NOT NULL,
    full_name text,
    birth_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.vignette_supplier_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    environment text DEFAULT 'SANDBOX'::text NOT NULL,
    http_status integer,
    ok boolean DEFAULT false NOT NULL,
    error text,
    product_count integer DEFAULT 0 NOT NULL,
    raw_response jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vignette_supplier_snapshots_environment_check CHECK ((environment = 'SANDBOX'::text))
);

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.admin_invitations
    ADD CONSTRAINT admin_invitations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.airport_content
    ADD CONSTRAINT airport_content_airport_id_key UNIQUE (airport_id);

ALTER TABLE ONLY public.airport_content
    ADD CONSTRAINT airport_content_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.airports
    ADD CONSTRAINT airports_iata_key UNIQUE (iata);

ALTER TABLE ONLY public.airports
    ADD CONSTRAINT airports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.canonical_destinations
    ADD CONSTRAINT canonical_destinations_canonical_code_key UNIQUE (canonical_code);

ALTER TABLE ONLY public.canonical_destinations
    ADD CONSTRAINT canonical_destinations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cms_documents
    ADD CONSTRAINT cms_documents_key_key UNIQUE (key);

ALTER TABLE ONLY public.cms_documents
    ADD CONSTRAINT cms_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cms_translations
    ADD CONSTRAINT cms_translations_document_id_locale_key UNIQUE (document_id, locale);

ALTER TABLE ONLY public.cms_translations
    ADD CONSTRAINT cms_translations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cms_versions
    ADD CONSTRAINT cms_versions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_iso2_key UNIQUE (iso2);

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_esims
    ADD CONSTRAINT customer_esims_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_lounge_bookings
    ADD CONSTRAINT customer_lounge_bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_notification_preferences
    ADD CONSTRAINT customer_notification_preferences_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.customer_trip_services
    ADD CONSTRAINT customer_trip_services_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_trips
    ADD CONSTRAINT customer_trips_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.destination_content
    ADD CONSTRAINT destination_content_country_id_key UNIQUE (country_id);

ALTER TABLE ONLY public.destination_content
    ADD CONSTRAINT destination_content_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.esim_device_compatibility
    ADD CONSTRAINT esim_device_compatibility_brand_model_key UNIQUE (brand, model);

ALTER TABLE ONLY public.esim_device_compatibility
    ADD CONSTRAINT esim_device_compatibility_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.esim_product_details
    ADD CONSTRAINT esim_product_details_pkey PRIMARY KEY (product_id);

ALTER TABLE ONLY public.esim_usage_settings
    ADD CONSTRAINT esim_usage_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_base_currency_quote_currency_captured_at_key UNIQUE (base_currency, quote_currency, captured_at);

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.guide_categories
    ADD CONSTRAINT guide_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guide_categories
    ADD CONSTRAINT guide_categories_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.guide_relations
    ADD CONSTRAINT guide_relations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guide_routes
    ADD CONSTRAINT guide_routes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guide_routes
    ADD CONSTRAINT guide_routes_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_guide_id_locale_key UNIQUE (guide_id, locale);

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_locale_slug_key UNIQUE (locale, slug);

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.lounge_product_details
    ADD CONSTRAINT lounge_product_details_pkey PRIMARY KEY (product_id);

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ops_alerts
    ADD CONSTRAINT ops_alerts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_idempotency_key_key UNIQUE (idempotency_key);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_psp_psp_transaction_id_key UNIQUE (psp, psp_transaction_id);

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_translations
    ADD CONSTRAINT product_translations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_translations
    ADD CONSTRAINT product_translations_product_id_locale_key UNIQUE (product_id, locale);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.promotion_redemptions
    ADD CONSTRAINT promotion_redemptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.promotion_redemptions
    ADD CONSTRAINT promotion_redemptions_promotion_id_order_id_key UNIQUE (promotion_id, order_id);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_catalogue_changes
    ADD CONSTRAINT provider_catalogue_changes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_connections
    ADD CONSTRAINT provider_connections_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_connections
    ADD CONSTRAINT provider_connections_provider_id_environment_key UNIQUE (provider_id, environment);

ALTER TABLE ONLY public.provider_price_history
    ADD CONSTRAINT provider_price_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_product_mappings
    ADD CONSTRAINT provider_product_mappings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_product_mappings
    ADD CONSTRAINT provider_product_mappings_provider_id_external_id_key UNIQUE (provider_id, external_id);

ALTER TABLE ONLY public.provider_raw_items
    ADD CONSTRAINT provider_raw_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_raw_items
    ADD CONSTRAINT provider_raw_items_provider_id_external_id_key UNIQUE (provider_id, external_id);

ALTER TABLE ONLY public.provider_sync_errors
    ADD CONSTRAINT provider_sync_errors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_sync_runs
    ADD CONSTRAINT provider_sync_runs_idempotency_key_key UNIQUE (idempotency_key);

ALTER TABLE ONLY public.provider_sync_runs
    ADD CONSTRAINT provider_sync_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_code_key UNIQUE (code);

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provisioning_units
    ADD CONSTRAINT provisioning_units_key_unique UNIQUE (idempotency_key);

ALTER TABLE ONLY public.provisioning_units
    ADD CONSTRAINT provisioning_units_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provisioning_units
    ADD CONSTRAINT provisioning_units_unit_unique UNIQUE (order_item_id, unit_index);

ALTER TABLE ONLY public.refund_request_events
    ADD CONSTRAINT refund_request_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_code_key UNIQUE (code);

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.route_presets
    ADD CONSTRAINT route_presets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.route_presets
    ADD CONSTRAINT route_presets_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.security_rate_limits
    ADD CONSTRAINT security_rate_limits_pkey PRIMARY KEY (bucket, window_start);

ALTER TABLE ONLY public.seo_authors
    ADD CONSTRAINT seo_authors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.seo_authors
    ADD CONSTRAINT seo_authors_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.service_products
    ADD CONSTRAINT service_products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.service_products
    ADD CONSTRAINT service_products_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (service_type);

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.theme_settings
    ADD CONSTRAINT theme_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.traffic_attribution
    ADD CONSTRAINT traffic_attribution_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.travelers
    ADD CONSTRAINT travelers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE ONLY public.vignette_supplier_snapshots
    ADD CONSTRAINT vignette_supplier_snapshots_pkey PRIMARY KEY (id);

CREATE INDEX account_deletion_requests_user_idx ON public.account_deletion_requests USING btree (user_id);

CREATE UNIQUE INDEX admin_invitations_pending_email ON public.admin_invitations USING btree (email) WHERE (status = 'PENDING'::text);

CREATE INDEX analytics_events_event_name_occurred_at_idx ON public.analytics_events USING btree (event_name, occurred_at);

CREATE INDEX canonical_destinations_type_idx ON public.canonical_destinations USING btree (type, active);

CREATE INDEX esim_details_subdivision_idx ON public.esim_product_details USING gin (coverage_subdivision_codes);

CREATE INDEX esim_product_details_coverage_country_isos_gin_idx ON public.esim_product_details USING gin (coverage_country_isos);

CREATE INDEX guide_relations_airport_idx ON public.guide_relations USING btree (airport_iata);

CREATE INDEX guide_relations_country_idx ON public.guide_relations USING btree (country_iso);

CREATE INDEX guide_relations_guide_idx ON public.guide_relations USING btree (guide_id);

CREATE INDEX guide_relations_service_idx ON public.guide_relations USING btree (service_type);

CREATE INDEX guide_translations_slug_idx ON public.guide_translations USING btree (locale, slug);

CREATE INDEX guides_category_idx ON public.guides USING btree (category_id);

CREATE INDEX guides_country_iso_idx ON public.guides USING btree (country_iso);

CREATE INDEX guides_rel_service_country_idx ON public.guides USING btree (rel_service, country_iso);

CREATE INDEX guides_status_idx ON public.guides USING btree (status, published_at DESC);

CREATE UNIQUE INDEX ops_alerts_one_refund_alert_per_request ON public.ops_alerts USING btree (entity_id) WHERE ((type = 'REFUND_REQUEST'::public.alert_type) AND (entity_type = 'refund_requests'::text));

CREATE UNIQUE INDEX orders_idempotency_key_unique ON public.orders USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);

CREATE INDEX promotion_redemptions_customer_idx ON public.promotion_redemptions USING btree (promotion_id, customer_id);

CREATE UNIQUE INDEX promotions_code_key ON public.promotions USING btree (code);

CREATE INDEX provider_catalogue_changes_provider_idx ON public.provider_catalogue_changes USING btree (provider_id, created_at DESC);

CREATE INDEX provider_catalogue_changes_run_idx ON public.provider_catalogue_changes USING btree (sync_run_id);

CREATE INDEX provider_price_history_provider_idx ON public.provider_price_history USING btree (provider_id, created_at DESC);

CREATE INDEX provider_raw_items_run_idx ON public.provider_raw_items USING btree (provider_id, last_sync_run_id);

CREATE INDEX provider_sync_runs_active_idx ON public.provider_sync_runs USING btree (provider_id, status, started_at DESC);

CREATE INDEX provisioning_units_order_idx ON public.provisioning_units USING btree (order_id);

CREATE INDEX provisioning_units_status_idx ON public.provisioning_units USING btree (status);

CREATE INDEX refund_request_events_request_idx ON public.refund_request_events USING btree (refund_request_id, created_at);

CREATE UNIQUE INDEX refund_requests_one_open_per_esim ON public.refund_requests USING btree (customer_esim_id) WHERE ((customer_esim_id IS NOT NULL) AND is_open);

CREATE UNIQUE INDEX refund_requests_one_open_per_item ON public.refund_requests USING btree (order_item_id) WHERE ((order_item_id IS NOT NULL) AND is_open);

CREATE INDEX refund_requests_requested_by_idx ON public.refund_requests USING btree (requested_by, created_at DESC);

CREATE INDEX service_products_is_test_idx ON public.service_products USING btree (is_test);

CREATE INDEX service_products_primary_provider_id_idx ON public.service_products USING btree (primary_provider_id);

CREATE INDEX service_products_public_esim_sort_idx ON public.service_products USING btree (sort_order, id) WHERE ((service_type = 'ESIM'::public.service_type) AND (lifecycle = 'PUBLISHED'::public.product_lifecycle) AND (customer_visible = true) AND (provider_available = true) AND (margin_flagged = false) AND (sale_price > (0)::numeric));

CREATE INDEX service_products_service_type_lifecycle_idx ON public.service_products USING btree (service_type, lifecycle);

CREATE INDEX service_products_source_idx ON public.service_products USING btree (source);

CREATE TRIGGER account_deletion_requests_touch BEFORE UPDATE ON public.account_deletion_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER admin_invitations_touch BEFORE UPDATE ON public.admin_invitations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER airport_content_touch BEFORE UPDATE ON public.airport_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER campaigns_touch BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER cms_touch BEFORE UPDATE ON public.cms_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER customer_notification_preferences_touch BEFORE UPDATE ON public.customer_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER destination_content_touch BEFORE UPDATE ON public.destination_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER esims_touch BEFORE UPDATE ON public.customer_esims FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER flags_touch BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER guide_categories_touch BEFORE UPDATE ON public.guide_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER guide_routes_touch BEFORE UPDATE ON public.guide_routes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER guide_translations_touch BEFORE UPDATE ON public.guide_translations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER guides_touch BEFORE UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER lounge_touch BEFORE UPDATE ON public.customer_lounge_bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER media_assets_touch BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER platform_settings_touch BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER pricing_rules_touch BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER promotions_touch BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER provider_connections_touch BEFORE UPDATE ON public.provider_connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER providers_touch BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER provisioning_units_touch BEFORE UPDATE ON public.provisioning_units FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER refund_request_events_no_change BEFORE DELETE OR UPDATE ON public.refund_request_events FOR EACH ROW EXECUTE FUNCTION public.refund_events_append_only();

CREATE TRIGGER refund_requests_force_initial_state BEFORE INSERT ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.refund_request_force_initial_state();

CREATE TRIGGER refund_requests_guard BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.guard_refund_request();

CREATE TRIGGER refund_requests_guard_insert BEFORE INSERT ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.guard_refund_request_insert();

CREATE TRIGGER refund_requests_set_open BEFORE INSERT ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.refund_request_set_open();

CREATE TRIGGER route_presets_touch BEFORE UPDATE ON public.route_presets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER seo_authors_touch BEFORE UPDATE ON public.seo_authors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER service_products_touch BEFORE UPDATE ON public.service_products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER services_touch BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER theme_settings_touch BEFORE UPDATE ON public.theme_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trips_touch BEFORE UPDATE ON public.customer_trips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.admin_invitations
    ADD CONSTRAINT admin_invitations_accepted_user_id_fkey FOREIGN KEY (accepted_user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.admin_invitations
    ADD CONSTRAINT admin_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.airport_content
    ADD CONSTRAINT airport_content_airport_id_fkey FOREIGN KEY (airport_id) REFERENCES public.airports(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.airport_content
    ADD CONSTRAINT airport_content_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.airport_content
    ADD CONSTRAINT airport_content_mobile_media_id_fkey FOREIGN KEY (mobile_media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.airport_content
    ADD CONSTRAINT airport_content_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.airports
    ADD CONSTRAINT airports_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_airport_id_fkey FOREIGN KEY (airport_id) REFERENCES public.airports(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_mobile_media_id_fkey FOREIGN KEY (mobile_media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.cms_translations
    ADD CONSTRAINT cms_translations_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.cms_documents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.cms_versions
    ADD CONSTRAINT cms_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cms_versions
    ADD CONSTRAINT cms_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.cms_documents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.customer_esims
    ADD CONSTRAINT customer_esims_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_esims
    ADD CONSTRAINT customer_esims_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_lounge_bookings
    ADD CONSTRAINT customer_lounge_bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_lounge_bookings
    ADD CONSTRAINT customer_lounge_bookings_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_notification_preferences
    ADD CONSTRAINT customer_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_trip_services
    ADD CONSTRAINT customer_trip_services_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.customer_trip_services
    ADD CONSTRAINT customer_trip_services_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.customer_trips(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_trips
    ADD CONSTRAINT customer_trips_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_trips
    ADD CONSTRAINT customer_trips_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.destination_content
    ADD CONSTRAINT destination_content_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.destination_content
    ADD CONSTRAINT destination_content_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.destination_content
    ADD CONSTRAINT destination_content_mobile_media_id_fkey FOREIGN KEY (mobile_media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.destination_content
    ADD CONSTRAINT destination_content_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.esim_product_details
    ADD CONSTRAINT esim_product_details_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.esim_product_details
    ADD CONSTRAINT esim_product_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.service_products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.esim_product_details
    ADD CONSTRAINT esim_product_details_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.guide_relations
    ADD CONSTRAINT guide_relations_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.guides(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.guide_relations
    ADD CONSTRAINT guide_relations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.service_products(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.guide_relations
    ADD CONSTRAINT guide_relations_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.guide_relations
    ADD CONSTRAINT guide_relations_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.guide_routes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.guide_translations
    ADD CONSTRAINT guide_translations_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.guides(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.seo_authors(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.guide_categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_hero_media_id_fkey FOREIGN KEY (hero_media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.lounge_product_details
    ADD CONSTRAINT lounge_product_details_airport_id_fkey FOREIGN KEY (airport_id) REFERENCES public.airports(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.lounge_product_details
    ADD CONSTRAINT lounge_product_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.service_products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.ops_alerts
    ADD CONSTRAINT ops_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.service_products(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.customer_trips(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_translations
    ADD CONSTRAINT product_translations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.service_products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.promotion_redemptions
    ADD CONSTRAINT promotion_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.promotion_redemptions
    ADD CONSTRAINT promotion_redemptions_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.provider_catalogue_changes
    ADD CONSTRAINT provider_catalogue_changes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.service_products(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.provider_catalogue_changes
    ADD CONSTRAINT provider_catalogue_changes_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_catalogue_changes
    ADD CONSTRAINT provider_catalogue_changes_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES public.provider_sync_runs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.provider_connections
    ADD CONSTRAINT provider_connections_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_price_history
    ADD CONSTRAINT provider_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.service_products(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.provider_price_history
    ADD CONSTRAINT provider_price_history_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_price_history
    ADD CONSTRAINT provider_price_history_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES public.provider_sync_runs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.provider_product_mappings
    ADD CONSTRAINT provider_product_mappings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.service_products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_product_mappings
    ADD CONSTRAINT provider_product_mappings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_product_mappings
    ADD CONSTRAINT provider_product_mappings_raw_item_id_fkey FOREIGN KEY (raw_item_id) REFERENCES public.provider_raw_items(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.provider_raw_items
    ADD CONSTRAINT provider_raw_items_last_sync_run_id_fkey FOREIGN KEY (last_sync_run_id) REFERENCES public.provider_sync_runs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.provider_raw_items
    ADD CONSTRAINT provider_raw_items_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_sync_errors
    ADD CONSTRAINT provider_sync_errors_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_sync_errors
    ADD CONSTRAINT provider_sync_errors_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES public.provider_sync_runs(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_sync_runs
    ADD CONSTRAINT provider_sync_runs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.provider_connections(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.provider_sync_runs
    ADD CONSTRAINT provider_sync_runs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provisioning_units
    ADD CONSTRAINT provisioning_units_customer_esim_id_fkey FOREIGN KEY (customer_esim_id) REFERENCES public.customer_esims(id);

ALTER TABLE ONLY public.provisioning_units
    ADD CONSTRAINT provisioning_units_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provisioning_units
    ADD CONSTRAINT provisioning_units_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provisioning_units
    ADD CONSTRAINT provisioning_units_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);

ALTER TABLE ONLY public.refund_request_events
    ADD CONSTRAINT refund_request_events_refund_request_id_fkey FOREIGN KEY (refund_request_id) REFERENCES public.refund_requests(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_customer_esim_id_fkey FOREIGN KEY (customer_esim_id) REFERENCES public.customer_esims(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.route_presets
    ADD CONSTRAINT route_presets_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.route_presets
    ADD CONSTRAINT route_presets_mobile_media_id_fkey FOREIGN KEY (mobile_media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.route_presets
    ADD CONSTRAINT route_presets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.service_products
    ADD CONSTRAINT service_products_airport_id_fkey FOREIGN KEY (airport_id) REFERENCES public.airports(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.service_products
    ADD CONSTRAINT service_products_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.service_products
    ADD CONSTRAINT service_products_pricing_rule_id_fkey FOREIGN KEY (pricing_rule_id) REFERENCES public.pricing_rules(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.service_products
    ADD CONSTRAINT service_products_primary_provider_id_fkey FOREIGN KEY (primary_provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.service_products
    ADD CONSTRAINT service_products_service_type_fkey FOREIGN KEY (service_type) REFERENCES public.services(service_type);

ALTER TABLE ONLY public.theme_settings
    ADD CONSTRAINT theme_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.traffic_attribution
    ADD CONSTRAINT traffic_attribution_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.traffic_attribution
    ADD CONSTRAINT traffic_attribution_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.travelers
    ADD CONSTRAINT travelers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Admins can insert usage settings" ON public.esim_usage_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update usage settings" ON public.esim_usage_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert vignette snapshots" ON public.vignette_supplier_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins read vignette snapshots" ON public.vignette_supplier_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Usage settings are publicly readable" ON public.esim_usage_settings FOR SELECT USING (true);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read invitations" ON public.admin_invitations FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "airport content admin write" ON public.airport_content TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "airport content public read" ON public.airport_content FOR SELECT TO authenticated, anon USING ((customer_visible = true));

ALTER TABLE public.airport_content ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "airports admin" ON public.airports TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "airports read" ON public.airports FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "alerts admin" ON public.ops_alerts TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "analytics admin read" ON public.analytics_events FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attribution admin read" ON public.traffic_attribution FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "audit admin read" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns admin read" ON public.campaigns FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "campaigns admin write" ON public.campaigns TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "campaigns public read" ON public.campaigns FOR SELECT TO authenticated, anon USING ((active AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at >= now()))));

CREATE POLICY "canonical destinations admin write" ON public.canonical_destinations TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "canonical destinations readable" ON public.canonical_destinations FOR SELECT TO authenticated, anon USING ((active = true));

ALTER TABLE public.canonical_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogue changes admin" ON public.provider_catalogue_changes TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "cms admin" ON public.cms_documents TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "cms published read" ON public.cms_documents FOR SELECT TO authenticated, anon USING (((status = 'PUBLISHED'::public.content_status) AND visible));

CREATE POLICY "cms translations admin" ON public.cms_translations TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "cms translations read" ON public.cms_translations FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.cms_documents d
  WHERE ((d.id = cms_translations.document_id) AND (d.status = 'PUBLISHED'::public.content_status) AND d.visible))));

CREATE POLICY "cms versions admin" ON public.cms_versions TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.cms_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cms_translations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cms_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries admin" ON public.countries TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "countries read" ON public.countries FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.customer_esims ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customer_lounge_bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customer_trip_services ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customer_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "destination content admin write" ON public.destination_content TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "destination content public read" ON public.destination_content FOR SELECT TO authenticated, anon USING ((customer_visible = true));

ALTER TABLE public.destination_content ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "destinations admin" ON public.destinations TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "destinations read" ON public.destinations FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY device_compatibility_admin_insert ON public.esim_device_compatibility FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY device_compatibility_admin_read ON public.esim_device_compatibility FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY device_compatibility_admin_update ON public.esim_device_compatibility FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY device_compatibility_public_read ON public.esim_device_compatibility FOR SELECT TO authenticated, anon USING ((active = true));

CREATE POLICY "esim details admin" ON public.esim_product_details TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "esim details public read" ON public.esim_product_details FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.service_products p
  WHERE ((p.id = esim_product_details.product_id) AND (p.lifecycle = 'PUBLISHED'::public.product_lifecycle) AND p.customer_visible))));

ALTER TABLE public.esim_device_compatibility ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.esim_product_details ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.esim_usage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esims own" ON public.customer_esims FOR SELECT TO authenticated USING (((auth.uid() = customer_id) OR public.is_admin()));

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flags admin write" ON public.feature_flags TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "flags public read" ON public.feature_flags FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "fx admin" ON public.exchange_rates TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "fx read" ON public.exchange_rates FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.guide_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY guide_categories_admin_all ON public.guide_categories TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY guide_categories_public_read ON public.guide_categories FOR SELECT USING ((active = true));

ALTER TABLE public.guide_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY guide_relations_admin_all ON public.guide_relations TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY guide_relations_public_read ON public.guide_relations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.guides g
  WHERE ((g.id = guide_relations.guide_id) AND (g.status = 'PUBLISHED'::public.content_status)))));

ALTER TABLE public.guide_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY guide_routes_admin_all ON public.guide_routes TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY guide_routes_public_read ON public.guide_routes FOR SELECT USING ((active = true));

ALTER TABLE public.guide_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY guide_translations_admin_all ON public.guide_translations TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY guide_translations_public_read ON public.guide_translations FOR SELECT USING (((translation_status = 'PUBLISHED'::public.content_status) AND (EXISTS ( SELECT 1
   FROM public.guides g
  WHERE ((g.id = guide_translations.guide_id) AND (g.status = 'PUBLISHED'::public.content_status))))));

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY guides_admin_all ON public.guides TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY guides_public_read ON public.guides FOR SELECT USING ((status = 'PUBLISHED'::public.content_status));

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lounge bookings own" ON public.customer_lounge_bookings FOR SELECT TO authenticated USING (((auth.uid() = customer_id) OR public.is_admin()));

CREATE POLICY "lounge details admin" ON public.lounge_product_details TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "lounge details public read" ON public.lounge_product_details FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.service_products p
  WHERE ((p.id = lounge_product_details.product_id) AND (p.lifecycle = 'PUBLISHED'::public.product_lifecycle) AND p.customer_visible))));

ALTER TABLE public.lounge_product_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mappings admin" ON public.provider_product_mappings TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "media admin write" ON public.media_assets TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "media public read" ON public.media_assets FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order items own read" ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND ((o.customer_id = auth.uid()) OR public.is_admin())))));

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders own read" ON public.orders FOR SELECT TO authenticated USING (((auth.uid() = customer_id) OR public.is_admin()));

CREATE POLICY "own deletion requests insert" ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "own deletion requests select" ON public.account_deletion_requests FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.is_admin()));

CREATE POLICY "own notification prefs insert" ON public.customer_notification_preferences FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "own notification prefs select" ON public.customer_notification_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "own notification prefs update" ON public.customer_notification_preferences FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));

CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments admin read" ON public.payment_transactions FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "platform settings admin write" ON public.platform_settings TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price history admin" ON public.provider_price_history TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_rules admin" ON public.pricing_rules TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "product translations admin" ON public.product_translations TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "product translations public read" ON public.product_translations FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.service_products p
  WHERE ((p.id = product_translations.product_id) AND (p.lifecycle = 'PUBLISHED'::public.product_lifecycle) AND p.customer_visible))));

ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products admin" ON public.service_products TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "products public read" ON public.service_products FOR SELECT TO authenticated, anon USING (((lifecycle = 'PUBLISHED'::public.product_lifecycle) AND (customer_visible = true)));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotion redemptions admin read" ON public.promotion_redemptions FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions admin insert" ON public.promotions FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "promotions admin read" ON public.promotions FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "promotions admin update" ON public.promotions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.provider_catalogue_changes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_connections admin" ON public.provider_connections TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.provider_price_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_product_mappings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_raw_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_sync_errors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_sync_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers admin" ON public.providers TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "provisioning units admin read" ON public.provisioning_units FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.provisioning_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raw_items admin" ON public.provider_raw_items TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.is_admin()));

CREATE POLICY "refund events admin read" ON public.refund_request_events FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "refund events admin write" ON public.refund_request_events FOR INSERT TO authenticated WITH CHECK ((public.is_admin() AND (actor_id = auth.uid()) AND (actor_type = 'ADMIN'::text)));

ALTER TABLE public.refund_request_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refunds admin update" ON public.refund_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "refunds own" ON public.refund_requests FOR SELECT TO authenticated USING (((requested_by = auth.uid()) OR public.is_admin()));

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regions admin" ON public.regions TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "regions read" ON public.regions FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "route presets admin write" ON public.route_presets TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "route presets public read" ON public.route_presets FOR SELECT TO authenticated, anon USING ((active = true));

ALTER TABLE public.route_presets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.seo_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY seo_authors_admin_all ON public.seo_authors TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY seo_authors_public_read ON public.seo_authors FOR SELECT USING (true);

ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services admin write" ON public.services TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "services public read" ON public.services FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "sync_errors admin" ON public.provider_sync_errors TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "sync_runs admin" ON public.provider_sync_runs TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "theme admin write" ON public.theme_settings TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "theme public read" ON public.theme_settings FOR SELECT TO authenticated, anon USING ((published IS NOT NULL));

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.traffic_attribution ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.travelers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travelers own" ON public.travelers TO authenticated USING (((auth.uid() = customer_id) OR public.is_admin())) WITH CHECK ((auth.uid() = customer_id));

CREATE POLICY "trip services link" ON public.customer_trip_services FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.customer_trips t
  WHERE ((t.id = customer_trip_services.trip_id) AND (t.customer_id = auth.uid())))));

CREATE POLICY "trip services own" ON public.customer_trip_services FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.customer_trips t
  WHERE ((t.id = customer_trip_services.trip_id) AND ((t.customer_id = auth.uid()) OR public.is_admin())))));

CREATE POLICY "trips own" ON public.customer_trips TO authenticated USING (((auth.uid() = customer_id) OR public.is_admin())) WITH CHECK ((auth.uid() = customer_id));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vignette_supplier_snapshots ENABLE ROW LEVEL SECURITY;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;
-- Signup creates the profile and customer role (auth lifecycle trigger).
DO $h$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgrelid = 'auth.users'::regclass) THEN
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $h$;

-- Privileges (exact copy of the live database).
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON FUNCTION public.accept_admin_invitation() TO anon;
GRANT ALL ON FUNCTION public.accept_admin_invitation() TO authenticated;
GRANT ALL ON FUNCTION public.accept_admin_invitation() TO service_role;
GRANT ALL ON FUNCTION public.cancel_admin_invitation(_id uuid) TO anon;
GRANT ALL ON FUNCTION public.cancel_admin_invitation(_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cancel_admin_invitation(_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.consume_rate_limit(_bucket text, _limit integer, _window_seconds integer) TO anon;
GRANT ALL ON FUNCTION public.consume_rate_limit(_bucket text, _limit integer, _window_seconds integer) TO authenticated;
GRANT ALL ON FUNCTION public.consume_rate_limit(_bucket text, _limit integer, _window_seconds integer) TO service_role;
GRANT ALL ON FUNCTION public.esim_plan_tier(_groups jsonb) TO anon;
GRANT ALL ON FUNCTION public.esim_plan_tier(_groups jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.esim_plan_tier(_groups jsonb) TO service_role;
GRANT ALL ON FUNCTION public.guard_refund_request() TO anon;
GRANT ALL ON FUNCTION public.guard_refund_request() TO authenticated;
GRANT ALL ON FUNCTION public.guard_refund_request() TO service_role;
GRANT ALL ON FUNCTION public.guard_refund_request_insert() TO anon;
GRANT ALL ON FUNCTION public.guard_refund_request_insert() TO authenticated;
GRANT ALL ON FUNCTION public.guard_refund_request_insert() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.invite_admin(_email text, _note text, _token_hash text) TO anon;
GRANT ALL ON FUNCTION public.invite_admin(_email text, _note text, _token_hash text) TO authenticated;
GRANT ALL ON FUNCTION public.invite_admin(_email text, _note text, _token_hash text) TO service_role;
GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;
GRANT ALL ON FUNCTION public.list_admin_users() TO anon;
GRANT ALL ON FUNCTION public.list_admin_users() TO authenticated;
GRANT ALL ON FUNCTION public.list_admin_users() TO service_role;
GRANT ALL ON FUNCTION public.log_admin_action(_action text, _entity_type text, _entity_id text, _before jsonb, _after jsonb) TO anon;
GRANT ALL ON FUNCTION public.log_admin_action(_action text, _entity_type text, _entity_id text, _before jsonb, _after jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.log_admin_action(_action text, _entity_type text, _entity_id text, _before jsonb, _after jsonb) TO service_role;
GRANT ALL ON FUNCTION public.public_platform_settings(_id text) TO anon;
GRANT ALL ON FUNCTION public.public_platform_settings(_id text) TO authenticated;
GRANT ALL ON FUNCTION public.public_platform_settings(_id text) TO service_role;
GRANT ALL ON FUNCTION public.public_promotion_banner() TO anon;
GRANT ALL ON FUNCTION public.public_promotion_banner() TO authenticated;
GRANT ALL ON FUNCTION public.public_promotion_banner() TO service_role;
GRANT ALL ON FUNCTION public.refresh_admin_invitation(_id uuid, _token_hash text) TO anon;
GRANT ALL ON FUNCTION public.refresh_admin_invitation(_id uuid, _token_hash text) TO authenticated;
GRANT ALL ON FUNCTION public.refresh_admin_invitation(_id uuid, _token_hash text) TO service_role;
GRANT ALL ON FUNCTION public.refund_events_append_only() TO anon;
GRANT ALL ON FUNCTION public.refund_events_append_only() TO authenticated;
GRANT ALL ON FUNCTION public.refund_events_append_only() TO service_role;
GRANT ALL ON FUNCTION public.refund_request_force_initial_state() TO anon;
GRANT ALL ON FUNCTION public.refund_request_force_initial_state() TO authenticated;
GRANT ALL ON FUNCTION public.refund_request_force_initial_state() TO service_role;
GRANT ALL ON FUNCTION public.refund_request_set_open() TO anon;
GRANT ALL ON FUNCTION public.refund_request_set_open() TO authenticated;
GRANT ALL ON FUNCTION public.refund_request_set_open() TO service_role;
GRANT ALL ON FUNCTION public.revoke_admin(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.revoke_admin(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.revoke_admin(_user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.security_baseline_status() TO anon;
GRANT ALL ON FUNCTION public.security_baseline_status() TO authenticated;
GRANT ALL ON FUNCTION public.security_baseline_status() TO service_role;
GRANT ALL ON FUNCTION public.storefront_country_starting_prices(_isos text[], _show_test boolean) TO anon;
GRANT ALL ON FUNCTION public.storefront_country_starting_prices(_isos text[], _show_test boolean) TO authenticated;
GRANT ALL ON FUNCTION public.storefront_country_starting_prices(_isos text[], _show_test boolean) TO service_role;
GRANT ALL ON FUNCTION public.storefront_regional_package_rows(_show_test boolean) TO anon;
GRANT ALL ON FUNCTION public.storefront_regional_package_rows(_show_test boolean) TO authenticated;
GRANT ALL ON FUNCTION public.storefront_regional_package_rows(_show_test boolean) TO service_role;
GRANT ALL ON FUNCTION public.touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_updated_at() TO service_role;
GRANT ALL ON TABLE public.account_deletion_requests TO anon;
GRANT ALL ON TABLE public.account_deletion_requests TO authenticated;
GRANT ALL ON TABLE public.account_deletion_requests TO service_role;
GRANT ALL ON TABLE public.admin_audit_log TO anon;
GRANT ALL ON TABLE public.admin_audit_log TO authenticated;
GRANT ALL ON TABLE public.admin_audit_log TO service_role;
GRANT ALL ON TABLE public.admin_invitations TO anon;
GRANT ALL ON TABLE public.admin_invitations TO authenticated;
GRANT ALL ON TABLE public.admin_invitations TO service_role;
GRANT ALL ON TABLE public.airport_content TO anon;
GRANT ALL ON TABLE public.airport_content TO authenticated;
GRANT ALL ON TABLE public.airport_content TO service_role;
GRANT ALL ON TABLE public.airports TO anon;
GRANT ALL ON TABLE public.airports TO authenticated;
GRANT ALL ON TABLE public.airports TO service_role;
GRANT ALL ON TABLE public.analytics_events TO anon;
GRANT ALL ON TABLE public.analytics_events TO authenticated;
GRANT ALL ON TABLE public.analytics_events TO service_role;
GRANT ALL ON TABLE public.campaigns TO anon;
GRANT ALL ON TABLE public.campaigns TO authenticated;
GRANT ALL ON TABLE public.campaigns TO service_role;
GRANT ALL ON TABLE public.canonical_destinations TO anon;
GRANT ALL ON TABLE public.canonical_destinations TO authenticated;
GRANT ALL ON TABLE public.canonical_destinations TO service_role;
GRANT ALL ON TABLE public.cms_documents TO anon;
GRANT ALL ON TABLE public.cms_documents TO authenticated;
GRANT ALL ON TABLE public.cms_documents TO service_role;
GRANT ALL ON TABLE public.cms_translations TO anon;
GRANT ALL ON TABLE public.cms_translations TO authenticated;
GRANT ALL ON TABLE public.cms_translations TO service_role;
GRANT ALL ON TABLE public.cms_versions TO anon;
GRANT ALL ON TABLE public.cms_versions TO authenticated;
GRANT ALL ON TABLE public.cms_versions TO service_role;
GRANT ALL ON TABLE public.countries TO anon;
GRANT ALL ON TABLE public.countries TO authenticated;
GRANT ALL ON TABLE public.countries TO service_role;
GRANT ALL ON TABLE public.customer_esims TO anon;
GRANT ALL ON TABLE public.customer_esims TO authenticated;
GRANT ALL ON TABLE public.customer_esims TO service_role;
GRANT ALL ON TABLE public.customer_lounge_bookings TO anon;
GRANT ALL ON TABLE public.customer_lounge_bookings TO authenticated;
GRANT ALL ON TABLE public.customer_lounge_bookings TO service_role;
GRANT ALL ON TABLE public.customer_notification_preferences TO anon;
GRANT ALL ON TABLE public.customer_notification_preferences TO authenticated;
GRANT ALL ON TABLE public.customer_notification_preferences TO service_role;
GRANT ALL ON TABLE public.customer_trip_services TO anon;
GRANT ALL ON TABLE public.customer_trip_services TO authenticated;
GRANT ALL ON TABLE public.customer_trip_services TO service_role;
GRANT ALL ON TABLE public.customer_trips TO anon;
GRANT ALL ON TABLE public.customer_trips TO authenticated;
GRANT ALL ON TABLE public.customer_trips TO service_role;
GRANT ALL ON TABLE public.destination_content TO anon;
GRANT ALL ON TABLE public.destination_content TO authenticated;
GRANT ALL ON TABLE public.destination_content TO service_role;
GRANT ALL ON TABLE public.destinations TO anon;
GRANT ALL ON TABLE public.destinations TO authenticated;
GRANT ALL ON TABLE public.destinations TO service_role;
GRANT ALL ON TABLE public.esim_device_compatibility TO anon;
GRANT ALL ON TABLE public.esim_device_compatibility TO authenticated;
GRANT ALL ON TABLE public.esim_device_compatibility TO service_role;
GRANT ALL ON TABLE public.esim_product_details TO anon;
GRANT ALL ON TABLE public.esim_product_details TO authenticated;
GRANT ALL ON TABLE public.esim_product_details TO service_role;
GRANT ALL ON TABLE public.esim_usage_settings TO anon;
GRANT ALL ON TABLE public.esim_usage_settings TO authenticated;
GRANT ALL ON TABLE public.esim_usage_settings TO service_role;
GRANT ALL ON TABLE public.exchange_rates TO anon;
GRANT ALL ON TABLE public.exchange_rates TO authenticated;
GRANT ALL ON TABLE public.exchange_rates TO service_role;
GRANT ALL ON TABLE public.feature_flags TO anon;
GRANT ALL ON TABLE public.feature_flags TO authenticated;
GRANT ALL ON TABLE public.feature_flags TO service_role;
GRANT ALL ON TABLE public.guide_categories TO anon;
GRANT ALL ON TABLE public.guide_categories TO authenticated;
GRANT ALL ON TABLE public.guide_categories TO service_role;
GRANT ALL ON TABLE public.guide_relations TO anon;
GRANT ALL ON TABLE public.guide_relations TO authenticated;
GRANT ALL ON TABLE public.guide_relations TO service_role;
GRANT ALL ON TABLE public.guide_routes TO anon;
GRANT ALL ON TABLE public.guide_routes TO authenticated;
GRANT ALL ON TABLE public.guide_routes TO service_role;
GRANT ALL ON TABLE public.guide_translations TO anon;
GRANT ALL ON TABLE public.guide_translations TO authenticated;
GRANT ALL ON TABLE public.guide_translations TO service_role;
GRANT ALL ON TABLE public.guides TO anon;
GRANT ALL ON TABLE public.guides TO authenticated;
GRANT ALL ON TABLE public.guides TO service_role;
GRANT ALL ON TABLE public.idempotency_keys TO anon;
GRANT ALL ON TABLE public.idempotency_keys TO authenticated;
GRANT ALL ON TABLE public.idempotency_keys TO service_role;
GRANT ALL ON TABLE public.lounge_product_details TO anon;
GRANT ALL ON TABLE public.lounge_product_details TO authenticated;
GRANT ALL ON TABLE public.lounge_product_details TO service_role;
GRANT ALL ON TABLE public.media_assets TO anon;
GRANT ALL ON TABLE public.media_assets TO authenticated;
GRANT ALL ON TABLE public.media_assets TO service_role;
GRANT ALL ON TABLE public.ops_alerts TO anon;
GRANT ALL ON TABLE public.ops_alerts TO authenticated;
GRANT ALL ON TABLE public.ops_alerts TO service_role;
GRANT ALL ON TABLE public.order_items TO anon;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;
GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON TABLE public.payment_transactions TO anon;
GRANT ALL ON TABLE public.payment_transactions TO authenticated;
GRANT ALL ON TABLE public.payment_transactions TO service_role;
GRANT ALL ON TABLE public.platform_settings TO anon;
GRANT ALL ON TABLE public.platform_settings TO authenticated;
GRANT ALL ON TABLE public.platform_settings TO service_role;
GRANT ALL ON TABLE public.pricing_rules TO anon;
GRANT ALL ON TABLE public.pricing_rules TO authenticated;
GRANT ALL ON TABLE public.pricing_rules TO service_role;
GRANT ALL ON TABLE public.product_translations TO anon;
GRANT ALL ON TABLE public.product_translations TO authenticated;
GRANT ALL ON TABLE public.product_translations TO service_role;
GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.promotion_redemptions TO anon;
GRANT ALL ON TABLE public.promotion_redemptions TO authenticated;
GRANT ALL ON TABLE public.promotion_redemptions TO service_role;
GRANT ALL ON TABLE public.promotions TO anon;
GRANT ALL ON TABLE public.promotions TO authenticated;
GRANT ALL ON TABLE public.promotions TO service_role;
GRANT ALL ON TABLE public.provider_catalogue_changes TO anon;
GRANT ALL ON TABLE public.provider_catalogue_changes TO authenticated;
GRANT ALL ON TABLE public.provider_catalogue_changes TO service_role;
GRANT ALL ON TABLE public.provider_connections TO anon;
GRANT ALL ON TABLE public.provider_connections TO authenticated;
GRANT ALL ON TABLE public.provider_connections TO service_role;
GRANT ALL ON TABLE public.provider_price_history TO anon;
GRANT ALL ON TABLE public.provider_price_history TO authenticated;
GRANT ALL ON TABLE public.provider_price_history TO service_role;
GRANT ALL ON TABLE public.provider_product_mappings TO anon;
GRANT ALL ON TABLE public.provider_product_mappings TO authenticated;
GRANT ALL ON TABLE public.provider_product_mappings TO service_role;
GRANT ALL ON TABLE public.provider_raw_items TO anon;
GRANT ALL ON TABLE public.provider_raw_items TO authenticated;
GRANT ALL ON TABLE public.provider_raw_items TO service_role;
GRANT ALL ON TABLE public.provider_sync_errors TO anon;
GRANT ALL ON TABLE public.provider_sync_errors TO authenticated;
GRANT ALL ON TABLE public.provider_sync_errors TO service_role;
GRANT ALL ON TABLE public.provider_sync_runs TO anon;
GRANT ALL ON TABLE public.provider_sync_runs TO authenticated;
GRANT ALL ON TABLE public.provider_sync_runs TO service_role;
GRANT ALL ON TABLE public.providers TO anon;
GRANT ALL ON TABLE public.providers TO authenticated;
GRANT ALL ON TABLE public.providers TO service_role;
GRANT ALL ON TABLE public.provisioning_units TO anon;
GRANT ALL ON TABLE public.provisioning_units TO authenticated;
GRANT ALL ON TABLE public.provisioning_units TO service_role;
GRANT ALL ON TABLE public.refund_request_events TO anon;
GRANT ALL ON TABLE public.refund_request_events TO authenticated;
GRANT ALL ON TABLE public.refund_request_events TO service_role;
GRANT ALL ON TABLE public.refund_requests TO anon;
GRANT ALL ON TABLE public.refund_requests TO authenticated;
GRANT ALL ON TABLE public.refund_requests TO service_role;
GRANT ALL ON TABLE public.regions TO anon;
GRANT ALL ON TABLE public.regions TO authenticated;
GRANT ALL ON TABLE public.regions TO service_role;
GRANT ALL ON TABLE public.route_presets TO anon;
GRANT ALL ON TABLE public.route_presets TO authenticated;
GRANT ALL ON TABLE public.route_presets TO service_role;
GRANT ALL ON TABLE public.security_rate_limits TO anon;
GRANT ALL ON TABLE public.security_rate_limits TO authenticated;
GRANT ALL ON TABLE public.security_rate_limits TO service_role;
GRANT ALL ON TABLE public.seo_authors TO anon;
GRANT ALL ON TABLE public.seo_authors TO authenticated;
GRANT ALL ON TABLE public.seo_authors TO service_role;
GRANT ALL ON TABLE public.service_products TO anon;
GRANT ALL ON TABLE public.service_products TO authenticated;
GRANT ALL ON TABLE public.service_products TO service_role;
GRANT ALL ON TABLE public.services TO anon;
GRANT ALL ON TABLE public.services TO authenticated;
GRANT ALL ON TABLE public.services TO service_role;
GRANT ALL ON TABLE public.theme_settings TO anon;
GRANT ALL ON TABLE public.theme_settings TO authenticated;
GRANT ALL ON TABLE public.theme_settings TO service_role;
GRANT ALL ON TABLE public.traffic_attribution TO anon;
GRANT ALL ON TABLE public.traffic_attribution TO authenticated;
GRANT ALL ON TABLE public.traffic_attribution TO service_role;
GRANT ALL ON TABLE public.travelers TO anon;
GRANT ALL ON TABLE public.travelers TO authenticated;
GRANT ALL ON TABLE public.travelers TO service_role;
GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT ALL ON TABLE public.vignette_supplier_snapshots TO anon;
GRANT ALL ON TABLE public.vignette_supplier_snapshots TO authenticated;
GRANT ALL ON TABLE public.vignette_supplier_snapshots TO service_role;
$pasaport_baseline$;
END $pasaport_guard$;
