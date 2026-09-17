
-- ============ PROVIDERS ============
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  service_type public.service_type not null,
  capabilities public.provider_capability[] not null default '{}',
  priority int not null default 100,
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Credentials are referenced by secret NAME only; secret values live server-side.
create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  environment text not null default 'sandbox',
  base_url text,
  credential_secret_names text[] not null default '{}',
  webhook_secret_name text,
  rate_limit_per_minute int,
  status text not null default 'NOT_CONFIGURED',
  last_checked_at timestamptz,
  last_sync_at timestamptz,
  sync_cron text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, environment)
);

create table public.provider_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  connection_id uuid references public.provider_connections(id) on delete set null,
  trigger public.sync_trigger not null default 'MANUAL',
  status public.sync_status not null default 'PENDING',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  items_received int not null default 0,
  items_created int not null default 0,
  items_updated int not null default 0,
  items_unchanged int not null default 0,
  items_unavailable int not null default 0,
  items_failed int not null default 0,
  error_summary text,
  idempotency_key text unique
);

create table public.provider_raw_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  external_id text not null,
  service_type public.service_type not null,
  payload jsonb not null,
  payload_hash text not null,
  available boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_sync_run_id uuid references public.provider_sync_runs(id) on delete set null,
  unique (provider_id, external_id)
);

create table public.provider_sync_errors (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references public.provider_sync_runs(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  external_id text,
  code text,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ PRICING RULES (admin-owned) ============
create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_type public.service_type,
  provider_id uuid references public.providers(id) on delete cascade,
  strategy public.pricing_strategy not null default 'MARKUP_PERCENT',
  markup_percent numeric(6,2),
  fixed_markup numeric(12,4),
  minimum_margin_percent numeric(6,2),
  rounding_mode text not null default 'NONE',
  rounding_ending numeric(6,4),
  currency text not null default 'EUR',
  priority int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ COMMON PRODUCT LAYER (admin-owned marketing + provider-owned cost) ============
create table public.service_products (
  id uuid primary key default gen_random_uuid(),
  service_type public.service_type not null references public.services(service_type),
  slug text not null unique,
  name text not null,
  lifecycle public.product_lifecycle not null default 'DRAFT',
  -- provider-owned
  primary_provider_id uuid references public.providers(id) on delete set null,
  provider_external_id text,
  provider_cost numeric(12,4),
  provider_currency text default 'EUR',
  provider_available boolean not null default true,
  provider_synced_at timestamptz,
  -- admin-owned
  currency text not null default 'EUR',
  sale_price numeric(12,4),
  pricing_rule_id uuid references public.pricing_rules(id) on delete set null,
  price_overridden boolean not null default false,
  customer_visible boolean not null default false,
  featured boolean not null default false,
  badge text,
  sort_order int not null default 0,
  margin_flagged boolean not null default false,
  destination_id uuid references public.destinations(id) on delete set null,
  airport_id uuid references public.airports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.service_products (service_type, lifecycle);
create index on public.service_products (primary_provider_id);

create table public.provider_product_mappings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.service_products(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  external_id text not null,
  raw_item_id uuid references public.provider_raw_items(id) on delete set null,
  provider_cost numeric(12,4),
  provider_currency text default 'EUR',
  available boolean not null default true,
  priority int not null default 100,
  last_synced_at timestamptz,
  unique (provider_id, external_id)
);

-- ============ ESIM DETAILS ============
create table public.esim_product_details (
  product_id uuid primary key references public.service_products(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  country_iso text,
  region_id uuid references public.regions(id) on delete set null,
  coverage_country_isos text[] not null default '{}',
  package_kind text not null default 'COUNTRY',
  data_gb numeric(10,2),
  unlimited_data boolean not null default false,
  validity_days int,
  provider_bundle_id text,
  network_operators text[] not null default '{}',
  supports_5g boolean,
  supports_hotspot boolean,
  data_only boolean,
  activation_policy text,
  validity_start_rule text,
  apn_info jsonb not null default '{}'::jsonb,
  topup_supported boolean,
  provider_metadata jsonb not null default '{}'::jsonb
);

-- ============ LOUNGE DETAILS ============
create table public.lounge_product_details (
  product_id uuid primary key references public.service_products(id) on delete cascade,
  airport_id uuid references public.airports(id) on delete set null,
  iata text,
  terminal text,
  lounge_name text,
  airside boolean,
  departure_eligible boolean,
  transit_eligible boolean,
  arrival_eligible boolean,
  opening_hours jsonb not null default '{}'::jsonb,
  timezone text,
  max_stay_minutes int,
  amenities text[] not null default '{}',
  adult_rules jsonb not null default '{}'::jsonb,
  child_rules jsonb not null default '{}'::jsonb,
  minimum_age int,
  booking_window_hours int,
  boarding_pass_required boolean,
  cancellation_rules jsonb not null default '{}'::jsonb,
  voucher_required boolean,
  provider_lounge_id text,
  provider_metadata jsonb not null default '{}'::jsonb
);

-- ============ TRANSLATIONS (admin-owned marketing copy) ============
create table public.product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.service_products(id) on delete cascade,
  locale public.locale_code not null,
  title text,
  short_description text,
  description text,
  seo_title text,
  seo_description text,
  unique (product_id, locale)
);

-- ============ GRANTS / RLS ============
grant all on public.providers, public.provider_connections, public.provider_sync_runs,
  public.provider_raw_items, public.provider_sync_errors, public.pricing_rules,
  public.service_products, public.provider_product_mappings, public.esim_product_details,
  public.lounge_product_details, public.product_translations to service_role;
grant select, insert, update, delete on public.providers, public.provider_connections,
  public.provider_sync_runs, public.provider_raw_items, public.provider_sync_errors,
  public.pricing_rules, public.service_products, public.provider_product_mappings,
  public.esim_product_details, public.lounge_product_details, public.product_translations to authenticated;
grant select on public.service_products, public.esim_product_details,
  public.lounge_product_details, public.product_translations to anon;

alter table public.providers enable row level security;
alter table public.provider_connections enable row level security;
alter table public.provider_sync_runs enable row level security;
alter table public.provider_raw_items enable row level security;
alter table public.provider_sync_errors enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.service_products enable row level security;
alter table public.provider_product_mappings enable row level security;
alter table public.esim_product_details enable row level security;
alter table public.lounge_product_details enable row level security;
alter table public.product_translations enable row level security;

-- provider + pricing internals: admin only
create policy "providers admin" on public.providers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "provider_connections admin" on public.provider_connections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "sync_runs admin" on public.provider_sync_runs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "raw_items admin" on public.provider_raw_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "sync_errors admin" on public.provider_sync_errors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "pricing_rules admin" on public.pricing_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mappings admin" on public.provider_product_mappings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- storefront: only published + visible products are public
create policy "products public read" on public.service_products for select to anon, authenticated
  using (lifecycle = 'PUBLISHED' and customer_visible = true);
create policy "products admin" on public.service_products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "esim details public read" on public.esim_product_details for select to anon, authenticated
  using (exists (select 1 from public.service_products p where p.id = product_id and p.lifecycle = 'PUBLISHED' and p.customer_visible));
create policy "esim details admin" on public.esim_product_details for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lounge details public read" on public.lounge_product_details for select to anon, authenticated
  using (exists (select 1 from public.service_products p where p.id = product_id and p.lifecycle = 'PUBLISHED' and p.customer_visible));
create policy "lounge details admin" on public.lounge_product_details for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "product translations public read" on public.product_translations for select to anon, authenticated
  using (exists (select 1 from public.service_products p where p.id = product_id and p.lifecycle = 'PUBLISHED' and p.customer_visible));
create policy "product translations admin" on public.product_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());

create trigger providers_touch before update on public.providers for each row execute function public.touch_updated_at();
create trigger provider_connections_touch before update on public.provider_connections for each row execute function public.touch_updated_at();
create trigger pricing_rules_touch before update on public.pricing_rules for each row execute function public.touch_updated_at();
create trigger service_products_touch before update on public.service_products for each row execute function public.touch_updated_at();
