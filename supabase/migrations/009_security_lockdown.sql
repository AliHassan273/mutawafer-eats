-- 009_security_lockdown.sql
-- شغّله في Supabase → SQL Editor مرة واحدة (آمن لو اتشغّل أكتر من مرة).
-- في آخره استعلام تأكيد: كل صف لازم يطلع زي ما مكتوب جنبه.
-- الـ ROLLBACK في آخر الملف عليه "--".

-- ============================================================
-- 1) profiles: الكتابة المباشرة مقفولة (ده أهم سطر: بيمنع أي مستخدم يرفع نفسه أدمن)
--    التعديل بيتم من الدوال و Edge Functions بس. المستخدم يقدر يعدّل اسمه بس.
-- ============================================================
drop policy if exists "users insert own profile" on public.profiles;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

-- ============================================================
-- 2) create_my_profile: ماتغيّرش الدور/الحالة لو الحساب موجود، وتتحقق من الموبايل
-- ============================================================
create or replace function public.create_my_profile(
  p_name text,
  p_phone text,
  p_role text default 'customer'
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
  v_email text;
  v_phone text;
begin
  if auth.uid() is null then
    raise exception 'يجب تأكيد البريد أولاً';
  end if;

  -- أرقام عربية → إنجليزية، وإزالة المسافات والشرطات
  v_phone := regexp_replace(
    translate(coalesce(p_phone, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
    '[\s\-]', '', 'g');
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'رقم الموبايل غير صحيح';
  end if;

  select u.email into v_email from auth.users u where u.id = auth.uid();

  begin
    insert into public.profiles (id, name, email, phone, role, status)
    values (
      auth.uid(),
      left(btrim(coalesce(p_name, '')), 100),
      coalesce(v_email, ''),
      v_phone,
      case when p_role = 'captain' then 'captain' else 'customer' end,
      case when p_role = 'captain' then 'pending' else 'approved' end
    )
    on conflict (id) do update
      set name = excluded.name,
          phone = excluded.phone
    returning * into result;
  exception when unique_violation then
    raise exception 'رقم الموبايل مستخدم بالفعل';
  end;

  return result;
end;
$$;

revoke execute on function public.create_my_profile(text, text, text) from public, anon;
grant execute on function public.create_my_profile(text, text, text) to authenticated;

-- ============================================================
-- 3) رقم الموبايل لازم يكون فريد
--    (من غيره: حد يسجّل برقم ضحية فيقفل عليه تسجيل الدخول بالموبايل)
-- ============================================================
do $$
begin
  if exists (select 1 from public.profiles where phone <> '' group by phone having count(*) > 1) then
    raise warning 'تم تخطي الـ unique index على phone: فيه أرقام مكررة. شغّل استعلام التكرار اللي في آخر الملف، صلّحهم، وأعد تشغيل الملف.';
  else
    create unique index if not exists profiles_phone_unique on public.profiles (phone) where phone <> '';
  end if;
end;
$$;

-- ============================================================
-- 4) Rate limit للـ Edge Functions (الدخول، استرجاع الباسورد، الرفع، الذكاء الاصطناعي)
--    الجدول مقفول على الواجهة تمامًا، والدالة للسيرفر (service_role) بس.
-- ============================================================
create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  insert into public.rate_limits as r (key, hits, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set hits = case
          when r.window_start < now() - make_interval(secs => p_window_seconds::double precision) then 1
          else r.hits + 1 end,
        window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds::double precision) then now()
          else r.window_start end
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- ============================================================
-- 5) الأوردرات: الخصم صفر (الواجهة مابتبعتش خصم أصلًا)، وحد أدنى لرسوم التوصيل
--    من إعدادات الموقع (نفس معادلة الواجهة)، ورسوم المطاعم الإضافية بتتحسب من الأصناف.
-- ============================================================
create or replace function public.trg_orders_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_set jsonb;
  v_floor numeric := 0;
  v_dist numeric;
  v_base numeric;
  v_per_km numeric;
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  new.user_id := auth.uid();
  new.status := 'Received';
  new.courier_id := null;
  new.courier_name := null;
  new.courier_phone := null;
  new.discount := 0;
  new.additional_restaurant_fee := greatest(coalesce(new.additional_restaurant_fee, 0), 0);
  new.doorstep_fee := greatest(coalesce(new.doorstep_fee, 0), 0);

  -- لو إعدادات الموقع فيها قيمة غريبة، مانوقفش الأوردر: بنكمّل بحد أدنى صفر
  begin
    select s.value into v_set from public.settings s where s.key = 'main';
    if coalesce(v_set->>'deliveryPricingType', 'area') = 'distance' then
      select coalesce(nullif(r.distance, 0), 1.2) into v_dist
      from public.restaurants r where r.id = new.restaurant_id;
      v_base := coalesce(nullif(nullif(v_set->>'distanceBaseFee', '')::numeric, 0), 10);
      v_per_km := coalesce(nullif(nullif(v_set->>'distanceFeePerKm', '')::numeric, 0), 5);
      v_floor := round(v_base + coalesce(v_dist, 1.2) * v_per_km);
    else
      select min((o.value->>'fee')::numeric) into v_floor
      from jsonb_array_elements(coalesce(v_set->'deliveryOptions', '[]'::jsonb)) as o(value);
      v_floor := coalesce(v_floor, 15);
    end if;
  exception when others then
    v_floor := 0;
  end;

  new.delivery_fee := greatest(coalesce(new.delivery_fee, 0), coalesce(v_floor, 0), 0);
  return new;
end;
$$;

drop trigger if exists trg_orders_before_insert on public.orders;
create trigger trg_orders_before_insert
before insert on public.orders
for each row execute function public.trg_orders_before_insert();

create or replace function public.trg_order_items_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub numeric;
  v_rest_count integer;
  v_add numeric;
begin
  select coalesce(sum(i.unit_price * i.quantity), 0), count(distinct i.restaurant_id)
    into v_sub, v_rest_count
  from public.order_items i
  where i.order_id = new.order_id;

  select greatest(coalesce(o.additional_restaurant_fee, 0), 5 * greatest(v_rest_count - 1, 0))
    into v_add
  from public.orders o
  where o.id = new.order_id;

  update public.orders o
  set subtotal = v_sub,
      additional_restaurant_fee = v_add,
      total = greatest(
        coalesce(o.total, 0),
        v_sub + coalesce(o.delivery_fee, 0) + v_add + coalesce(o.doorstep_fee, 0) - coalesce(o.discount, 0),
        0
      )
  where o.id = new.order_id;

  return null;
end;
$$;

drop trigger if exists trg_order_items_after_insert on public.order_items;
create trigger trg_order_items_after_insert
after insert on public.order_items
for each row execute function public.trg_order_items_after_insert();

-- ============================================================
-- 6) التقييمات: لصاحب الأوردر بس، بعد التسليم، مرة واحدة لكل أوردر،
--    والمطعم والكابتن والاسم بيتاخدوا من الأوردر نفسه مش من العميل.
-- ============================================================
create or replace function public.trg_reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_rest_name text;
begin
  -- السيرفر / SQL Editor (مفيش مستخدم): مسموح. الزوار بيتمنعوا بالـ RLS.
  if auth.uid() is null then
    return new;
  end if;

  select * into v_order from public.orders o where o.id = new.order_id;
  if not found or v_order.user_id is distinct from auth.uid() then
    raise exception 'لا يمكنك تقييم هذا الطلب.';
  end if;
  if v_order.status <> 'Delivered' then
    raise exception 'يمكن التقييم بعد تسليم الطلب فقط.';
  end if;
  if exists (select 1 from public.reviews r where r.order_id = new.order_id) then
    raise exception 'تم تقييم هذا الطلب من قبل.';
  end if;

  select r.name into v_rest_name from public.restaurants r where r.id = v_order.restaurant_id;

  new.user_id := auth.uid();
  new.restaurant_id := v_order.restaurant_id;
  new.restaurant_name := coalesce(v_rest_name, new.restaurant_name, '');
  new.courier_id := v_order.courier_id;
  new.courier_name := coalesce(v_order.courier_name, new.courier_name);
  new.customer_name := coalesce(nullif(v_order.customer_name, ''), new.customer_name, '');
  new.comment := left(coalesce(new.comment, ''), 500);
  return new;
end;
$$;

drop trigger if exists trg_reviews_before_insert on public.reviews;
create trigger trg_reviews_before_insert
before insert on public.reviews
for each row execute function public.trg_reviews_before_insert();

do $$
begin
  if exists (select 1 from public.reviews where order_id is not null group by order_id having count(*) > 1) then
    raise warning 'تم تخطي unique index على reviews.order_id: فيه أوردرات متقيّمة أكتر من مرة.';
  else
    create unique index if not exists reviews_one_per_order on public.reviews (order_id) where order_id is not null;
  end if;
end;
$$;

-- ============================================================
-- 7) صلاحيات الأدمن بتتطبّق فعلًا في الداتابيز (كانت في الواجهة بس!)
--    المدير الرئيسي (primary) عنده كل الصلاحيات دايمًا.
-- ============================================================
create or replace function public.admin_can(p_perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'primary'
        or (
          p.role = 'admin'
          and (
            (p_perm = 'orders' and coalesce(p.can_manage_orders, false))
            or (p_perm = 'captains' and coalesce(p.can_manage_captains, false))
            or (p_perm = 'restaurants' and coalesce(p.can_manage_restaurants, false))
            or (p_perm = 'menu' and coalesce(p.can_manage_menu, false))
            or (p_perm = 'ai' and coalesce(p.can_use_ai_scanner, false))
          )
        )
      )
  );
$$;

revoke execute on function public.admin_can(text) from public, anon;
grant execute on function public.admin_can(text) to authenticated;

drop policy if exists "admins manage restaurants" on public.restaurants;
create policy "admins manage restaurants" on public.restaurants
  for all to authenticated
  using (public.admin_can('restaurants')) with check (public.admin_can('restaurants'));

drop policy if exists "admins manage menu" on public.menu_items;
create policy "admins manage menu" on public.menu_items
  for all to authenticated
  using (public.admin_can('menu')) with check (public.admin_can('menu'));

drop policy if exists "admins manage sizes" on public.menu_item_sizes;
create policy "admins manage sizes" on public.menu_item_sizes
  for all to authenticated
  using (public.admin_can('menu')) with check (public.admin_can('menu'));

drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories
  for all to authenticated
  using (public.admin_can('menu')) with check (public.admin_can('menu'));

-- ============================================================
-- تأكيد: كل صف لازم يطلع زي ما مكتوب جنبه
-- ============================================================
select 'لازم false: المستخدم يقدر يعدّل role' as check_name,
       has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')::text as value
union all select 'لازم false: المستخدم يقدر يعمل INSERT في profiles',
       has_table_privilege('authenticated', 'public.profiles', 'INSERT')::text
union all select 'لازم true: المستخدم يقدر يعدّل name',
       has_column_privilege('authenticated', 'public.profiles', 'name', 'UPDATE')::text
union all select 'لازم true: unique index للموبايل',
       exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'profiles_phone_unique')::text
union all select 'لازم true: unique index للتقييمات',
       exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'reviews_one_per_order')::text
union all select 'لازم 5: عدد التريجرز',
       (select count(*) from pg_trigger
         where tgname in ('trg_orders_before_insert', 'trg_orders_before_update',
                          'trg_order_items_before_insert', 'trg_order_items_after_insert',
                          'trg_reviews_before_insert') and not tgisinternal)::text;

-- لازم ما يطلعش ولا صف (أرقام موبايل مكررة):
select phone, count(*) as how_many
from public.profiles
where phone <> ''
group by phone
having count(*) > 1;

-- ============================================================
-- ROLLBACK (شيل -- من الأسطر دي لو عايز ترجع)
-- ============================================================
-- drop trigger if exists trg_reviews_before_insert on public.reviews;
-- drop function if exists public.trg_reviews_before_insert();
-- drop index if exists public.reviews_one_per_order;
-- drop index if exists public.profiles_phone_unique;
-- drop function if exists public.rate_limit_hit(text, integer, integer);
-- drop table if exists public.rate_limits;
-- (سياسات الأدمن القديمة: create policy "admins manage menu" on public.menu_items for all using (public.is_admin()) with check (public.is_admin()); وهكذا لباقي الجداول)
-- (لا ترجّع صلاحية الكتابة على profiles أبدًا)
