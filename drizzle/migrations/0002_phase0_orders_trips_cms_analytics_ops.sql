
-- ============ TRAVELERS ============
create table public.travelers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  relation public.traveler_relation not null default 'SELF',
  full_name text,
  birth_date date,
  created_at timestamptz not null default now()
);

-- ============ TRIPS ============
create table public.customer_trips (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination_id uuid references public.destinations(id) on delete set null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ ORDERS (service independent) ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  guest_email text,
  guest_claim_token text,
  trip_id uuid references public.customer_trips(id) on delete set null,
  status public.order_status not null default 'DRAFT',
  payment_status public.payment_status not null default 'PENDING',
  fulfillment_status public.fulfillment_status not null default 'PENDING',
  currency text not null default 'EUR',
  gross_revenue numeric(12,4) not null default 0,
  discount_total numeric(12,4) not null default 0,
  tax_total numeric(12,4) not null default 0,
  payment_fee numeric(12,4) not null default 0,
  provider_cost_total numeric(12,4) not null default 0,
  refunded_total numeric(12,4) not null default 0,
  fx_rate_to_eur numeric(16,8),
  locale public.locale_code not null default 'tr',
  customer_country_iso text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- purchase-time snapshots; never mutated by catalogue changes
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_type public.service_type not null,
  product_id uuid references public.service_products(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  traveler_id uuid references public.travelers(id) on delete set null,
  product_name_snapshot text not null,
  product_slug_snapshot text,
  sale_price numeric(12,4) not null default 0,
  provider_cost numeric(12,4) not null default 0,
  discount numeric(12,4) not null default 0,
  currency text not null default 'EUR',
  quantity int not null default 1,
  destination_snapshot text,
  airport_iata_snapshot text,
  fulfillment_status public.fulfillment_status not null default 'PENDING',
  provider_reference text,
  details_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  psp text,
  psp_transaction_id text,
  kind text not null default 'PAYMENT',
  status public.payment_status not null default 'PENDING',
  amount numeric(12,4) not null default 0,
  fee numeric(12,4) not null default 0,
  currency text not null default 'EUR',
  payout_reference text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (psp, psp_transaction_id)
);

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  status public.refund_status not null default 'REQUESTED',
  amount numeric(12,4),
  currency text not null default 'EUR',
  reason text,
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  audit jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ TRIP <-> PURCHASED SERVICES ============
create table public.customer_trip_services (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.customer_trips(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  service_type public.service_type not null,
  created_at timestamptz not null default now()
);

-- customer-facing eSIM instance (populated in later phases)
create table public.customer_esims (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  traveler_label text,
  destination_label text,
  package_label text,
  status text not null default 'PENDING',
  total_data_mb bigint,
  remaining_data_mb bigint,
  expires_at timestamptz,
  iccid text,
  qr_payload text,
  install_info jsonb not null default '{}'::jsonb,
  topup_supported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- customer-facing lounge booking (populated in later phases)
create table public.customer_lounge_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  airport_iata text,
  terminal text,
  lounge_name text,
  visit_at timestamptz,
  travelers_count int not null default 1,
  status text not null default 'PENDING',
  booking_reference text,
  voucher_payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ IDEMPOTENCY ============
create table public.idempotency_keys (
  key text primary key,
  scope text not null,
  status text not null default 'IN_PROGRESS',
  response jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- ============ FX ============
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric(16,8) not null,
  captured_at timestamptz not null default now(),
  unique (base_currency, quote_currency, captured_at)
);

-- ============ CMS ============
create table public.cms_documents (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  kind text not null default 'PAGE',
  status public.content_status not null default 'DRAFT',
  published_at timestamptz,
  scheduled_at timestamptz,
  sort_order int not null default 0,
  visible boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.cms_translations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.cms_documents(id) on delete cascade,
  locale public.locale_code not null,
  data jsonb not null default '{}'::jsonb,
  unique (document_id, locale)
);
create table public.cms_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.cms_documents(id) on delete cascade,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ ANALYTICS ============
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  session_id text,
  customer_id uuid references auth.users(id) on delete set null,
  service_type public.service_type,
  locale public.locale_code,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index on public.analytics_events (event_name, occurred_at);

create table public.traffic_attribution (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  customer_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete cascade,
  first_touch_source public.attribution_source not null default 'UNKNOWN',
  last_touch_source public.attribution_source not null default 'UNKNOWN',
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  landing_path text,
  captured_at timestamptz not null default now()
);

-- ============ OPS ============
create table public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  type public.alert_type not null,
  status public.alert_status not null default 'OPEN',
  severity text not null default 'WARNING',
  entity_type text,
  entity_id uuid,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- ============ GRANTS ============
grant all on public.travelers, public.customer_trips, public.orders, public.order_items,
  public.payment_transactions, public.refund_requests, public.customer_trip_services,
  public.customer_esims, public.customer_lounge_bookings, public.idempotency_keys,
  public.exchange_rates, public.cms_documents, public.cms_translations, public.cms_versions,
  public.analytics_events, public.traffic_attribution, public.ops_alerts, public.admin_audit_log to service_role;
grant select, insert, update, delete on public.travelers, public.customer_trips to authenticated;
grant select on public.orders, public.order_items, public.refund_requests,
  public.customer_trip_services, public.customer_esims, public.customer_lounge_bookings,
  public.payment_transactions, public.exchange_rates, public.cms_documents,
  public.cms_translations, public.ops_alerts, public.admin_audit_log, public.cms_versions,
  public.analytics_events, public.traffic_attribution to authenticated;
grant insert on public.refund_requests, public.customer_trip_services to authenticated;
grant insert, update, delete on public.cms_documents, public.cms_translations, public.cms_versions,
  public.ops_alerts, public.exchange_rates to authenticated;
grant select on public.cms_documents, public.cms_translations, public.exchange_rates to anon;

-- ============ RLS ============
alter table public.travelers enable row level security;
alter table public.customer_trips enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.refund_requests enable row level security;
alter table public.customer_trip_services enable row level security;
alter table public.customer_esims enable row level security;
alter table public.customer_lounge_bookings enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.cms_documents enable row level security;
alter table public.cms_translations enable row level security;
alter table public.cms_versions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.traffic_attribution enable row level security;
alter table public.ops_alerts enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "travelers own" on public.travelers for all to authenticated using (auth.uid() = customer_id or public.is_admin()) with check (auth.uid() = customer_id);
create policy "trips own" on public.customer_trips for all to authenticated using (auth.uid() = customer_id or public.is_admin()) with check (auth.uid() = customer_id);
create policy "orders own read" on public.orders for select to authenticated using (auth.uid() = customer_id or public.is_admin());
create policy "order items own read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin())));
create policy "payments admin read" on public.payment_transactions for select to authenticated using (public.is_admin());
create policy "refunds own" on public.refund_requests for select to authenticated using (requested_by = auth.uid() or public.is_admin());
create policy "refunds request" on public.refund_requests for insert to authenticated with check (requested_by = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "trip services own" on public.customer_trip_services for select to authenticated using (exists (select 1 from public.customer_trips t where t.id = trip_id and (t.customer_id = auth.uid() or public.is_admin())));
create policy "trip services link" on public.customer_trip_services for insert to authenticated with check (exists (select 1 from public.customer_trips t where t.id = trip_id and t.customer_id = auth.uid()));
create policy "esims own" on public.customer_esims for select to authenticated using (auth.uid() = customer_id or public.is_admin());
create policy "lounge bookings own" on public.customer_lounge_bookings for select to authenticated using (auth.uid() = customer_id or public.is_admin());
create policy "fx read" on public.exchange_rates for select to anon, authenticated using (true);
create policy "fx admin" on public.exchange_rates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "cms published read" on public.cms_documents for select to anon, authenticated using (status = 'PUBLISHED' and visible);
create policy "cms admin" on public.cms_documents for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "cms translations read" on public.cms_translations for select to anon, authenticated using (exists (select 1 from public.cms_documents d where d.id = document_id and d.status = 'PUBLISHED' and d.visible));
create policy "cms translations admin" on public.cms_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "cms versions admin" on public.cms_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "analytics admin read" on public.analytics_events for select to authenticated using (public.is_admin());
create policy "attribution admin read" on public.traffic_attribution for select to authenticated using (public.is_admin());
create policy "alerts admin" on public.ops_alerts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "audit admin read" on public.admin_audit_log for select to authenticated using (public.is_admin());
-- idempotency_keys: service_role only, no client policies by design

create trigger trips_touch before update on public.customer_trips for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger cms_touch before update on public.cms_documents for each row execute function public.touch_updated_at();
create trigger esims_touch before update on public.customer_esims for each row execute function public.touch_updated_at();
create trigger lounge_touch before update on public.customer_lounge_bookings for each row execute function public.touch_updated_at();
