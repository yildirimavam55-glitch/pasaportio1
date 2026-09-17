
-- ============ ENUMS ============
create type public.app_role as enum ('admin','customer');
create type public.service_type as enum ('ESIM','LOUNGE','CAR_RENTAL','TRANSFER');
create type public.locale_code as enum ('tr','de','en');
create type public.product_lifecycle as enum ('IMPORTED','DRAFT','READY','PUBLISHED','PAUSED','UNAVAILABLE','ARCHIVED');
create type public.pricing_strategy as enum ('MANUAL','MARKUP_PERCENT','FIXED_MARKUP','MINIMUM_MARGIN');
create type public.provider_capability as enum ('CATALOGUE','REAL_TIME_AVAILABILITY','ORDER','CANCEL','REFUND','QR_OR_VOUCHER','USAGE','TOPUP','WEBHOOKS','BALANCE');
create type public.sync_status as enum ('PENDING','RUNNING','SUCCESS','PARTIAL','FAILED');
create type public.sync_trigger as enum ('SCHEDULED','MANUAL','WEBHOOK');
create type public.order_status as enum ('DRAFT','PENDING','CONFIRMED','COMPLETED','CANCELLED','REFUNDED');
create type public.payment_status as enum ('PENDING','AUTHORIZED','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED','CHARGEBACK');
create type public.fulfillment_status as enum ('PENDING','PROCESSING','FULFILLED','FAILED','CANCELLED');
create type public.refund_status as enum ('REQUESTED','APPROVED','REJECTED','PROCESSED');
create type public.content_status as enum ('DRAFT','PUBLISHED');
create type public.alert_type as enum ('PAID_NOT_FULFILLED','PROVIDER_ERROR','PROVISIONING_DELAYED','WEBHOOK_FAILED','QR_DELIVERY_FAILED','VOUCHER_DELIVERY_FAILED','CATALOGUE_SYNC_FAILED','CATALOGUE_STALE','LOW_PROVIDER_BALANCE','MARGIN_BELOW_MINIMUM','REFUND_REQUEST');
create type public.alert_status as enum ('OPEN','ACKNOWLEDGED','RESOLVED');
create type public.attribution_source as enum ('GOOGLE_ADS','META','TIKTOK','GOOGLE_ORGANIC','DIRECT','CRM','EMAIL','WHATSAPP','AFFILIATE','PARTNER','UNKNOWN');
create type public.traveler_relation as enum ('SELF','PARTNER','CHILD','OTHER');

-- ============ SHARED TRIGGER ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  preferred_locale public.locale_code not null default 'tr',
  country_iso text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict do nothing;
  return new;
end $$;

-- ============ ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.is_admin());
-- role grants are server-side only (service_role); no client write policy by design

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ SERVICES (multi-service registry) ============
create table public.services (
  service_type public.service_type primary key,
  slug text not null unique,
  enabled boolean not null default false,
  customer_visible boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services public read" on public.services for select to anon, authenticated using (true);
create policy "services admin write" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger services_touch before update on public.services for each row execute function public.touch_updated_at();

insert into public.services (service_type, slug, enabled, customer_visible, sort_order) values
  ('ESIM','esim',true,true,1),
  ('LOUNGE','lounge',true,true,2),
  ('CAR_RENTAL','car-rental',false,false,3),
  ('TRANSFER','transfer',false,false,4);

-- ============ FEATURE FLAGS / KILL SWITCHES ============
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.feature_flags to anon, authenticated;
grant all on public.feature_flags to service_role;
alter table public.feature_flags enable row level security;
create policy "flags public read" on public.feature_flags for select to anon, authenticated using (true);
create policy "flags admin write" on public.feature_flags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger flags_touch before update on public.feature_flags for each row execute function public.touch_updated_at();

insert into public.feature_flags (key, enabled, description) values
  ('checkout.esim', false, 'Allow eSIM checkout'),
  ('checkout.lounge', false, 'Allow Lounge checkout'),
  ('provider.sync', false, 'Allow provider catalogue synchronization'),
  ('guest_checkout', false, 'Allow guest checkout');

-- ============ LOCATIONS ============
create table public.regions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
create table public.countries (
  id uuid primary key default gen_random_uuid(),
  iso2 text not null unique,
  iso3 text,
  name text not null,
  region_id uuid references public.regions(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'COUNTRY',
  country_id uuid references public.countries(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.airports (
  id uuid primary key default gen_random_uuid(),
  iata text not null unique,
  icao text,
  name text not null,
  city text,
  timezone text,
  country_id uuid references public.countries(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.regions, public.countries, public.destinations, public.airports to anon, authenticated;
grant all on public.regions, public.countries, public.destinations, public.airports to service_role;
alter table public.regions enable row level security;
alter table public.countries enable row level security;
alter table public.destinations enable row level security;
alter table public.airports enable row level security;
create policy "regions read" on public.regions for select to anon, authenticated using (true);
create policy "regions admin" on public.regions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "countries read" on public.countries for select to anon, authenticated using (true);
create policy "countries admin" on public.countries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "destinations read" on public.destinations for select to anon, authenticated using (true);
create policy "destinations admin" on public.destinations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "airports read" on public.airports for select to anon, authenticated using (true);
create policy "airports admin" on public.airports for all to authenticated using (public.is_admin()) with check (public.is_admin());
