CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  note text,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES auth.users(id),
  delivery_state text NOT NULL DEFAULT 'NOT_SENT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_invitations_pending_email
  ON public.admin_invitations (email) WHERE status = 'PENDING';

GRANT SELECT ON public.admin_invitations TO authenticated;
GRANT ALL ON public.admin_invitations TO service_role;

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read invitations" ON public.admin_invitations;
CREATE POLICY "admins read invitations" ON public.admin_invitations
  FOR SELECT TO authenticated USING (public.is_admin());

DROP TRIGGER IF EXISTS admin_invitations_touch ON public.admin_invitations;
CREATE TRIGGER admin_invitations_touch BEFORE UPDATE ON public.admin_invitations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Listing: admins only; reads auth metadata through a definer function so no
-- broad profile/auth read access is granted to clients.
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.list_admin_users() FROM anon;

-- Invite / grant. Returns GRANTED when the email already has an account.
CREATE OR REPLACE FUNCTION public.invite_admin(_email text, _note text, _token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.invite_admin(text, text, text) FROM anon;

CREATE OR REPLACE FUNCTION public.cancel_admin_invitation(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.cancel_admin_invitation(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.refresh_admin_invitation(_id uuid, _token_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.refresh_admin_invitation(uuid, text) FROM anon;

-- Revoke with lockout protection: the last active admin can never be removed.
CREATE OR REPLACE FUNCTION public.revoke_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.revoke_admin(uuid) FROM anon;

-- Acceptance: only the invited, authenticated, email-verified user.
CREATE OR REPLACE FUNCTION public.accept_admin_invitation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.accept_admin_invitation() FROM anon;