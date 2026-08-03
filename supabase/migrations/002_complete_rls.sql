-- المرحلة الأولى: حماية البيانات والصلاحيات في Supabase
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','primary')
  );
$$;

create or replace function public.is_primary_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'primary');
$$;

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
alter table public.notifications enable row level security;

-- حذف السياسات القديمة بأمان حتى يمكن إعادة تشغيل الملف
 drop policy if exists "public can read restaurants" on public.restaurants;
 drop policy if exists "admins manage restaurants" on public.restaurants;
 drop policy if exists "public can read menu" on public.menu_items;
 drop policy if exists "admins manage menu" on public.menu_items;
 drop policy if exists "public can read sizes" on public.menu_item_sizes;
 drop policy if exists "admins manage sizes" on public.menu_item_sizes;
 drop policy if exists "users read own orders" on public.orders;
 drop policy if exists "users insert own orders" on public.orders;
 drop policy if exists "admins read all orders" on public.orders;
 drop policy if exists "admins update orders" on public.orders;
 drop policy if exists "captain update assigned orders" on public.orders;
 drop policy if exists "users read own order items" on public.order_items;
 drop policy if exists "users insert own order items" on public.order_items;
 drop policy if exists "public can read reviews" on public.reviews;
 drop policy if exists "users read own notifications" on public.notifications;
 drop policy if exists "users update own notifications" on public.notifications;
 drop policy if exists "admins insert notifications" on public.notifications;

create policy "public can read restaurants" on public.restaurants for select using (true);
create policy "admins manage restaurants" on public.restaurants for all using (public.is_admin()) with check (public.is_admin());
create policy "public can read categories" on public.categories for select using (visible = true);
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "public can read menu" on public.menu_items for select using (true);
create policy "admins manage menu" on public.menu_items for all using (public.is_admin()) with check (public.is_admin());
create policy "public can read sizes" on public.menu_item_sizes for select using (true);
create policy "admins manage sizes" on public.menu_item_sizes for all using (public.is_admin()) with check (public.is_admin());
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id or public.is_admin() or auth.uid() = courier_id);
create policy "users insert own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "admins update orders" on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy "captain update assigned orders" on public.orders for update using (auth.uid() = courier_id) with check (auth.uid() = courier_id);
create policy "users read own order items" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or o.courier_id = auth.uid() or public.is_admin())));
create policy "users insert own order items" on public.order_items for insert with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "public can read reviews" on public.reviews for select using (true);
create policy "users insert reviews" on public.reviews for insert with check (auth.uid() = user_id);
create policy "users read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins insert notifications" on public.notifications for insert with check (public.is_admin() or auth.uid() = user_id);
create policy "captains manage location" on public.captain_locations for all using (auth.uid() = captain_id or public.is_admin()) with check (auth.uid() = captain_id or public.is_admin());
create policy "users read order location" on public.captain_locations for select using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admins manage settings" on public.settings for all using (public.is_primary_admin()) with check (public.is_primary_admin());
create policy "public read main settings" on public.settings for select using (key = 'main');
