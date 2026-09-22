INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u WHERE lower(u.email) = 'yldrm.e5560@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'customer'::app_role FROM auth.users u WHERE lower(u.email) = 'yldrm.e5560@gmail.com'
ON CONFLICT DO NOTHING;