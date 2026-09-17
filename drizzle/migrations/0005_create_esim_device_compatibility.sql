create table if not exists public.esim_device_compatibility (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  family text,
  model text not null,
  aliases text[] not null default '{}',
  status text not null check (status in ('COMPATIBLE','UNCERTAIN','NOT_COMPATIBLE')),
  notes text,
  region_variant_warning boolean not null default false,
  active boolean not null default true,
  last_reviewed date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand, model)
);

grant select on public.esim_device_compatibility to anon;
grant select, insert, update on public.esim_device_compatibility to authenticated;
grant all on public.esim_device_compatibility to service_role;

alter table public.esim_device_compatibility enable row level security;

create policy "device_compatibility_public_read"
  on public.esim_device_compatibility for select
  to anon, authenticated
  using (active = true);

create policy "device_compatibility_admin_read"
  on public.esim_device_compatibility for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "device_compatibility_admin_insert"
  on public.esim_device_compatibility for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "device_compatibility_admin_update"
  on public.esim_device_compatibility for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.esim_device_compatibility (brand, family, model, aliases, status, region_variant_warning) values
  ('Apple','iPhone','iPhone 17 Pro Max','{"17 pro max"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 17 Pro','{"17 pro"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 17','{"17"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 16 Pro Max','{"16 pro max"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 16 Pro','{"16 pro"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 16','{"16"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 15 Pro Max','{"15 pro max"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 15 Pro','{"15 pro"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 15','{"15"}','COMPATIBLE',false),
  ('Apple','iPhone','iPhone 14','{"14"}','COMPATIBLE',true),
  ('Apple','iPhone','iPhone 13','{"13"}','COMPATIBLE',true),
  ('Apple','iPhone','iPhone 12','{"12"}','COMPATIBLE',true),
  ('Apple','iPhone','iPhone 11','{"11"}','COMPATIBLE',true),
  ('Apple','iPhone','iPhone XR','{"xr"}','COMPATIBLE',true),
  ('Apple','iPhone','iPhone XS','{"xs"}','COMPATIBLE',true),
  ('Apple','iPhone','iPhone SE (2020)','{"se 2020","se 2"}','COMPATIBLE',true),
  ('Apple','iPhone','iPhone SE (2022)','{"se 2022","se 3"}','COMPATIBLE',true),
  ('Apple','iPhone','iPhone 8','{"8"}','NOT_COMPATIBLE',false),
  ('Apple','iPhone','iPhone 7','{"7"}','NOT_COMPATIBLE',false),
  ('Samsung','Galaxy S','Galaxy S25 Ultra','{"s25 ultra"}','COMPATIBLE',false),
  ('Samsung','Galaxy S','Galaxy S25','{"s25"}','COMPATIBLE',false),
  ('Samsung','Galaxy S','Galaxy S24 Ultra','{"s24 ultra"}','COMPATIBLE',false),
  ('Samsung','Galaxy S','Galaxy S24','{"s24"}','COMPATIBLE',false),
  ('Samsung','Galaxy S','Galaxy S23','{"s23"}','COMPATIBLE',false),
  ('Samsung','Galaxy S','Galaxy S22','{"s22"}','COMPATIBLE',true),
  ('Samsung','Galaxy S','Galaxy S21','{"s21"}','COMPATIBLE',true),
  ('Samsung','Galaxy S','Galaxy S20','{"s20"}','UNCERTAIN',true),
  ('Samsung','Galaxy Z','Galaxy Z Fold 6','{"z fold 6","fold6"}','COMPATIBLE',false),
  ('Samsung','Galaxy Z','Galaxy Z Flip 6','{"z flip 6","flip6"}','COMPATIBLE',false),
  ('Samsung','Galaxy A','Galaxy A55','{"a55"}','UNCERTAIN',true),
  ('Samsung','Galaxy A','Galaxy A54','{"a54"}','UNCERTAIN',true),
  ('Samsung','Galaxy A','Galaxy A35','{"a35"}','UNCERTAIN',true),
  ('Google','Pixel','Pixel 9 Pro','{"pixel9 pro"}','COMPATIBLE',false),
  ('Google','Pixel','Pixel 9','{"pixel9"}','COMPATIBLE',false),
  ('Google','Pixel','Pixel 8','{"pixel8"}','COMPATIBLE',false),
  ('Google','Pixel','Pixel 7','{"pixel7"}','COMPATIBLE',false),
  ('Google','Pixel','Pixel 6','{"pixel6"}','COMPATIBLE',false),
  ('Google','Pixel','Pixel 5','{"pixel5"}','COMPATIBLE',true),
  ('Google','Pixel','Pixel 4','{"pixel4"}','UNCERTAIN',true),
  ('Xiaomi','Xiaomi','Xiaomi 15','{"mi 15"}','COMPATIBLE',true),
  ('Xiaomi','Xiaomi','Xiaomi 14','{"mi 14"}','COMPATIBLE',true),
  ('Xiaomi','Xiaomi','Xiaomi 13','{"mi 13"}','UNCERTAIN',true),
  ('Xiaomi','Redmi','Redmi Note 13','{"note 13"}','NOT_COMPATIBLE',false),
  ('Motorola','Edge','Edge 50 Pro','{"edge50 pro"}','COMPATIBLE',true),
  ('Motorola','Edge','Edge 40','{"edge40"}','COMPATIBLE',true),
  ('Motorola','Razr','Razr 40 Ultra','{"razr40 ultra"}','COMPATIBLE',true),
  ('Huawei','P','P40','{"p40"}','UNCERTAIN',true),
  ('Huawei','Mate','Mate 40 Pro','{"mate40 pro"}','UNCERTAIN',true),
  ('Huawei','Nova','Nova 12','{"nova12"}','NOT_COMPATIBLE',false),
  ('Other','Oppo','Find X5 Pro','{"find x5 pro"}','UNCERTAIN',true),
  ('Other','OnePlus','OnePlus 12','{"oneplus12"}','UNCERTAIN',true),
  ('Other','Sony','Xperia 1 VI','{"xperia 1 vi"}','COMPATIBLE',true),
  ('Other','Nothing','Nothing Phone (2)','{"nothing phone 2"}','COMPATIBLE',true)
on conflict (brand, model) do nothing;