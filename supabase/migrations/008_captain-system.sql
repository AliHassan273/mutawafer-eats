-- captain-system.sql (النسخة 2)، بيحل محل أي نسخة سابقة.
-- الترتيب: شغّل harden-orders.sql الأول (لو لسه)، وبعدها الملف ده. مرة واحدة في SQL Editor.
--
-- بيغطي نفس منطق Express القديم:
--   * الأدمن يعيّن كابتن للأوردر (أو يعيّن نفسه / أدمن تاني)
--   * الكابتن يقبل أوردر متاح بنفسه، ثم يأكّد التسليم
--   * اسم ورقم الكابتن بيتسجّلوا على الأوردر وقت الإسناد (العميل بيشوفهم)
--   * اعتماد/إيقاف كابتن، وصلاحيات الأدمنز، وتتبع الموقع
-- كل الكتابة الحساسة بقت من دوال، مش من جداول مفتوحة.

-- ============================================================
-- 0) أعمدة الكابتن على الأوردر + تنظيف النسخة القديمة
-- ============================================================
alter table public.orders add column if not exists courier_name text;
alter table public.orders add column if not exists courier_phone text;

drop function if exists public.release_order(uuid);
drop function if exists public.get_order_courier(uuid);
drop function if exists public.admin_assign_courier(uuid, uuid);

-- ============================================================
-- 1) دوال مساعدة
-- ============================================================
-- كابتن معتمد، أو أدمن (الأدمن ممكن يشتغل كابتن زي القديم)
create or replace function public.is_courier()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role in ('admin', 'primary') or (p.role = 'captain' and p.status = 'approved'))
  );
$$;

-- صلاحيات الأدمن ('orders' أو 'captains'). المدير الرئيسي عنده الكل.
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
          )
        )
      )
  );
$$;

-- ============================================================
-- 2) الأوردر الجديد: العميل مايقدرش يحدد كابتن ولا حالة ولا أرقام سالبة
--    (نسخة محدّثة من harden-orders، بتصفّر أعمدة الكابتن كمان)
-- ============================================================
create or replace function public.trg_orders_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  new.user_id := auth.uid();
  new.status := 'Received';
  new.courier_id := null;
  new.courier_name := null;
  new.courier_phone := null;
  new.delivery_fee := greatest(coalesce(new.delivery_fee, 0), 0);
  new.additional_restaurant_fee := greatest(coalesce(new.additional_restaurant_fee, 0), 0);
  new.doorstep_fee := greatest(coalesce(new.doorstep_fee, 0), 0);
  new.discount := greatest(coalesce(new.discount, 0), 0);
  return new;
end;
$$;

drop trigger if exists trg_orders_before_insert on public.orders;
create trigger trg_orders_before_insert
before insert on public.orders
for each row execute function public.trg_orders_before_insert();

-- الكابتن ماعادش يعدّل الأوردر مباشرة: كل تعديلاته من set_order_status تحت
drop policy if exists "captain update assigned orders" on public.orders;

-- ============================================================
-- 3) الكابتن: الأوردرات المتاحة (من غير كابتن، وليها أصناف، وآخر 24 ساعة، من غير رقم العميل)
-- ============================================================
create or replace function public.get_available_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_courier() then
    raise exception 'غير مصرح.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'restaurant_id', o.restaurant_id,
        'restaurant_name', r.name,
        'delivery_address', o.delivery_address,
        'delivery_fee', o.delivery_fee,
        'additional_restaurant_fee', o.additional_restaurant_fee,
        'doorstep_fee', o.doorstep_fee,
        'total', o.total,
        'payment_method', o.payment_method,
        'eta', o.eta,
        'status', o.status,
        'created_at', o.created_at,
        'items_count', (select count(*) from public.order_items i where i.order_id = o.id)
      )
      order by o.created_at desc
    )
    from public.orders o
    left join public.restaurants r on r.id = o.restaurant_id
    where o.courier_id is null
      and o.status in ('Received', 'Preparing')
      and o.created_at > now() - interval '24 hours'
      and exists (select 1 from public.order_items i where i.order_id = o.id)
  ), '[]'::jsonb);
end;
$$;

-- ============================================================
-- 4) الكابتن: استلام أوردر وبدء التوصيل (ذرّي: لو اتنين ضغطوا مع بعض، واحد بس ياخده)
-- ============================================================
create or replace function public.claim_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_phone text;
  v_order public.orders;
begin
  if not public.is_courier() then
    raise exception 'غير مصرح.';
  end if;

  select p.name, p.phone into v_name, v_phone
  from public.profiles p
  where p.id = auth.uid();

  update public.orders o
  set courier_id = auth.uid(),
      courier_name = v_name,
      courier_phone = v_phone,
      status = 'OutForDelivery'
  where o.id = p_order_id
    and o.courier_id is null
    and o.status in ('Received', 'Preparing')
  returning o.* into v_order;

  if not found then
    raise exception 'الطلب لم يعد متاحًا.';
  end if;

  return to_jsonb(v_order);
end;
$$;

-- ============================================================
-- 5) الأدمن: تعيين كابتن (أو أدمن) لأوردر. p_courier_id = null لإلغاء التعيين
-- ============================================================
create or replace function public.admin_assign_courier(
  p_order_id uuid,
  p_courier_id uuid,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_phone text;
  v_order public.orders;
begin
  if not public.admin_can('orders') then
    raise exception 'غير مصرح.';
  end if;

  if p_status is not null
     and p_status not in ('Pending', 'Received', 'Preparing', 'OutForDelivery', 'Delivered') then
    raise exception 'حالة غير صحيحة.';
  end if;

  if p_courier_id is null then
    update public.orders o
    set courier_id = null, courier_name = null, courier_phone = null,
        status = coalesce(p_status, o.status)
    where o.id = p_order_id and o.status <> 'Delivered'
    returning o.* into v_order;
  else
    select p.name, p.phone into v_name, v_phone
    from public.profiles p
    where p.id = p_courier_id
      and (p.role in ('admin', 'primary') or (p.role = 'captain' and p.status = 'approved'));

    if not found then
      raise exception 'الكابتن غير معتمد.';
    end if;

    update public.orders o
    set courier_id = p_courier_id,
        courier_name = v_name,
        courier_phone = v_phone,
        status = coalesce(p_status, 'OutForDelivery')
    where o.id = p_order_id and o.status <> 'Delivered'
    returning o.* into v_order;
  end if;

  if not found then
    raise exception 'تعذر تعيين الكابتن لهذا الطلب.';
  end if;

  return to_jsonb(v_order);
end;
$$;

-- ============================================================
-- 6) تغيير حالة الأوردر: الأدمن أي حالة، والكابتن يأكّد تسليم أوردره بس
-- ============================================================
create or replace function public.set_order_status(
  p_order_id uuid,
  p_status text,
  p_eta numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if p_status not in ('Pending', 'Received', 'Preparing', 'OutForDelivery', 'Delivered') then
    raise exception 'حالة غير صحيحة.';
  end if;

  if public.admin_can('orders') then
    update public.orders o
    set status = p_status, eta = coalesce(p_eta, o.eta)
    where o.id = p_order_id
    returning o.* into v_order;
  elsif public.is_courier() then
    if p_status <> 'Delivered' then
      raise exception 'مسموح بتأكيد التسليم فقط.';
    end if;
    update public.orders o
    set status = 'Delivered'
    where o.id = p_order_id
      and o.courier_id = auth.uid()
      and o.status = 'OutForDelivery'
    returning o.* into v_order;
  else
    raise exception 'غير مصرح.';
  end if;

  if not found then
    raise exception 'تعذر تحديث الطلب.';
  end if;

  return to_jsonb(v_order);
end;
$$;

-- ============================================================
-- 7) الأدمن: اعتماد/إيقاف كابتن، وصلاحيات الأدمنز (بدل الكتابة المباشرة على profiles)
-- ============================================================
create or replace function public.admin_set_captain_status(p_captain_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
begin
  if not public.admin_can('captains') then
    raise exception 'غير مصرح.';
  end if;

  if p_status not in ('approved', 'pending', 'rejected', 'suspended') then
    raise exception 'حالة غير صحيحة.';
  end if;

  update public.profiles p
  set status = p_status
  where p.id = p_captain_id and p.role = 'captain'
  returning jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'status', p.status)
  into v_row;

  if v_row is null then
    raise exception 'الكابتن غير موجود.';
  end if;

  return v_row;
end;
$$;

-- المدير الرئيسي بس. p_flags مفاتيحها camelCase زي ما الواجهة بتبعتها.
create or replace function public.admin_update_permissions(p_id uuid, p_flags jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
begin
  if not public.is_primary_admin() then
    raise exception 'المدير الرئيسي فقط.';
  end if;

  update public.profiles p
  set can_manage_restaurants = coalesce((p_flags->>'canManageRestaurants')::boolean, p.can_manage_restaurants),
      can_manage_menu        = coalesce((p_flags->>'canManageMenu')::boolean, p.can_manage_menu),
      can_use_ai_scanner     = coalesce((p_flags->>'canUseAIScanner')::boolean, p.can_use_ai_scanner),
      can_manage_orders      = coalesce((p_flags->>'canManageOrders')::boolean, p.can_manage_orders),
      can_manage_captains    = coalesce((p_flags->>'canManageCaptains')::boolean, p.can_manage_captains)
  where p.id = p_id and p.role = 'admin'
  returning jsonb_build_object(
    'id', p.id,
    'can_manage_restaurants', p.can_manage_restaurants,
    'can_manage_menu', p.can_manage_menu,
    'can_use_ai_scanner', p.can_use_ai_scanner,
    'can_manage_orders', p.can_manage_orders,
    'can_manage_captains', p.can_manage_captains
  ) into v_row;

  if v_row is null then
    raise exception 'الأدمن غير موجود.';
  end if;

  return v_row;
end;
$$;

-- ============================================================
-- 8) تتبع الموقع: الكابتن بيكتب موقعه هو بس. p_order_id ممكن يكون null (متصل من غير أوردر)
-- ============================================================
create or replace function public.update_captain_location(
  p_order_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_courier() then
    raise exception 'غير مصرح.';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception 'إحداثيات غير صحيحة.';
  end if;

  if p_order_id is not null and not exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.courier_id = auth.uid()
      and o.status <> 'Delivered'
  ) then
    raise exception 'هذا الطلب غير مسند إليك.';
  end if;

  insert into public.captain_locations (captain_id, order_id, lat, lng, updated_at)
  values (auth.uid(), p_order_id, p_lat, p_lng, now())
  on conflict (captain_id) do update
    set order_id = excluded.order_id,
        lat = excluded.lat,
        lng = excluded.lng,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function public.remove_captain_location()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.captain_locations where captain_id = auth.uid();
$$;

-- الكتابة على captain_locations بقت من الدوال بس
drop policy if exists "captains manage location" on public.captain_locations;
drop policy if exists "captain reads own location" on public.captain_locations;
create policy "captain reads own location" on public.captain_locations
  for select to authenticated using (auth.uid() = captain_id);
revoke insert, update, delete on public.captain_locations from anon, authenticated;

-- ============================================================
-- 9) كل مستخدم يقرأ بروفايله هو (الكابتن يعرف حالته: pending/approved)
-- ============================================================
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- ============================================================
-- 10) الصلاحيات: للمسجّلين بس
-- ============================================================
revoke execute on function public.is_courier() from public, anon;
revoke execute on function public.admin_can(text) from public, anon;
revoke execute on function public.get_available_orders() from public, anon;
revoke execute on function public.claim_order(uuid) from public, anon;
revoke execute on function public.admin_assign_courier(uuid, uuid, text) from public, anon;
revoke execute on function public.set_order_status(uuid, text, numeric) from public, anon;
revoke execute on function public.admin_set_captain_status(uuid, text) from public, anon;
revoke execute on function public.admin_update_permissions(uuid, jsonb) from public, anon;
revoke execute on function public.update_captain_location(uuid, double precision, double precision) from public, anon;
revoke execute on function public.remove_captain_location() from public, anon;

grant execute on function public.is_courier() to authenticated;
grant execute on function public.admin_can(text) to authenticated;
grant execute on function public.get_available_orders() to authenticated;
grant execute on function public.claim_order(uuid) to authenticated;
grant execute on function public.admin_assign_courier(uuid, uuid, text) to authenticated;
grant execute on function public.set_order_status(uuid, text, numeric) to authenticated;
grant execute on function public.admin_set_captain_status(uuid, text) to authenticated;
grant execute on function public.admin_update_permissions(uuid, jsonb) to authenticated;
grant execute on function public.update_captain_location(uuid, double precision, double precision) to authenticated;
grant execute on function public.remove_captain_location() to authenticated;

-- نسخة قديمة مابقتش مطلوبة
drop function if exists public.is_approved_captain();

-- تأكيد: لازم يطلع 10 دوال
select proname, prosecdef as security_definer
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_courier', 'admin_can', 'get_available_orders', 'claim_order',
                  'admin_assign_courier', 'set_order_status', 'admin_set_captain_status',
                  'admin_update_permissions', 'update_captain_location', 'remove_captain_location')
order by 1;

-- ROLLBACK (لو عايز ترجع): شيل -- من الأسطر دي
-- drop function if exists public.remove_captain_location();
-- drop function if exists public.update_captain_location(uuid, double precision, double precision);
-- drop function if exists public.admin_update_permissions(uuid, jsonb);
-- drop function if exists public.admin_set_captain_status(uuid, text);
-- drop function if exists public.set_order_status(uuid, text, numeric);
-- drop function if exists public.admin_assign_courier(uuid, uuid, text);
-- drop function if exists public.claim_order(uuid);
-- drop function if exists public.get_available_orders();
-- drop function if exists public.admin_can(text);
-- drop function if exists public.is_courier();
-- drop policy if exists "captain reads own location" on public.captain_locations;
-- create policy "captains manage location" on public.captain_locations for all
--   using ((auth.uid() = captain_id) or is_admin()) with check ((auth.uid() = captain_id) or is_admin());
-- grant insert, update, delete on public.captain_locations to authenticated;
-- create policy "captain update assigned orders" on public.orders for update
--   using (auth.uid() = courier_id) with check (auth.uid() = courier_id);
