-- مسافر إيتس: مخطط Supabase الأولي
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer','captain','admin','primary')),
  status text not null default 'approved',
  can_manage_restaurants boolean not null default false,
  can_manage_menu boolean not null default false,
  can_use_ai_scanner boolean not null default false,
  can_manage_orders boolean not null default false,
  can_manage_captains boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  name_ar text not null,
  icon text not null default '🍽️',
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cover_image text not null default '',
  categories text[] not null default '{}',
  promo text,
  rating numeric not null default 0,
  distance numeric not null default 0,
  delivery_time text not null default '',
  delivery_fee numeric not null default 0,
  description text not null default '',
  open_time text,
  close_time text,
  whatsapp_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric not null default 0,
  original_price numeric,
  image text not null default '',
  category text not null default 'أصناف متنوعة',
  created_at timestamptz not null default now()
);

create table if not exists public.menu_item_sizes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  original_price numeric
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  status text not null default 'Received',
  customer_name text not null default '',
  customer_phone text not null default '',
  delivery_address text not null default '',
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  additional_restaurant_fee numeric not null default 0,
  doorstep_fee numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null default 'cash',
  eta integer not null default 0,
  courier_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  name_snapshot text not null default '',
  category_snapshot text not null default '',
  size_name text,
  unit_price numeric not null default 0,
  quantity integer not null default 1 check (quantity > 0)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  courier_id uuid references public.profiles(id) on delete set null,
  customer_name text not null default '',
  restaurant_name text not null default '',
  courier_name text,
  rating_food_quality integer not null default 5 check (rating_food_quality between 1 and 5),
  rating_delivery_speed integer not null default 5 check (rating_delivery_speed between 1 and 5),
  rating_delivery_manner integer not null default 5 check (rating_delivery_manner between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.captain_locations (
  captain_id uuid primary key references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  lat numeric not null,
  lng numeric not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists reviews_created_idx on public.reviews(created_at desc);
create index if not exists locations_order_idx on public.captain_locations(order_id);

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_sizes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.captain_locations enable row level security;
alter table public.settings enable row level security;

create policy "public can read restaurants" on public.restaurants for select using (true);
create policy "public can read categories" on public.categories for select using (visible = true);
create policy "public can read menu" on public.menu_items for select using (true);
create policy "public can read sizes" on public.menu_item_sizes for select using (true);
create policy "public can read reviews" on public.reviews for select using (true);
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id);
create policy "users read own order items" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));


create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, role) values (new.id, coalesce(new.raw_user_meta_data->>'name',''), coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'phone',''), coalesce(new.raw_user_meta_data->>'role','customer')) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create policy "users insert own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "users insert own order items" on public.order_items for insert with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));


create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','primary'));
$$;
create policy "admins manage restaurants" on public.restaurants for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage menu" on public.menu_items for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage sizes" on public.menu_item_sizes for all using (public.is_admin()) with check (public.is_admin());

create policy "admins update orders" on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy "captain update assigned orders" on public.orders for update using (auth.uid() = courier_id) with check (auth.uid() = courier_id);
create policy "users read own locations" on public.captain_locations for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) or public.is_admin());
create policy "captains manage location" on public.captain_locations for all using (auth.uid() = captain_id) with check (auth.uid() = captain_id);

create policy "admins read all orders" on public.orders for select using (public.is_admin());
create policy "admins read all profiles" on public.profiles for select using (public.is_admin());


create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "users read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins insert notifications" on public.notifications for insert with check (public.is_admin() or auth.uid() = user_id);
