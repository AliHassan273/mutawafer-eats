-- harden-orders.sql
-- شغّله في Supabase → SQL Editor (مرة واحدة). لو الطلبات وقفت، شغّل قسم الـ ROLLBACK اللي في الآخر.
-- السيرفر (service_role) والأدمن والـ SQL Editor مستثنيين من كل القيود دي.

-- ============================================================
-- 1) أوردر جديد: العميل مايقدرش يحدد كابتن ولا حالة ولا أرقام سالبة
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

-- ============================================================
-- 2) تعديل الأوردر: غير الأدمن (يعني الكابتن) يغيّر الحالة والـ eta بس
-- ============================================================
create or replace function public.trg_orders_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if (to_jsonb(new) - 'status' - 'eta') is distinct from (to_jsonb(old) - 'status' - 'eta') then
    raise exception 'مسموح بتعديل حالة الطلب فقط.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_before_update on public.orders;
create trigger trg_orders_before_update
before update on public.orders
for each row execute function public.trg_orders_before_update();

-- ============================================================
-- 3) أصناف الأوردر: السعر والاسم بيتاخدوا من المنيو، مش من العميل
-- ============================================================
create or replace function public.trg_order_items_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_price numeric;
  v_name text;
  v_category text;
  v_restaurant uuid;
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if new.quantity is null or new.quantity < 1 or new.quantity > 50 then
    raise exception 'كمية غير صحيحة.';
  end if;

  -- الأصناف تتضاف على أوردر لسه جديد وبتاع نفس المستخدم
  if not exists (
    select 1 from public.orders o
    where o.id = new.order_id
      and o.user_id = auth.uid()
      and o.created_at > now() - interval '15 minutes'
  ) then
    raise exception 'لا يمكن إضافة أصناف لهذا الطلب.';
  end if;

  select m.name, m.category, m.restaurant_id, m.price
    into v_name, v_category, v_restaurant, v_price
  from public.menu_items m
  where m.id = new.menu_item_id;
  if not found then
    raise exception 'صنف غير موجود.';
  end if;

  if new.size_name is not null then
    select s.price into v_price
    from public.menu_item_sizes s
    where s.menu_item_id = new.menu_item_id and s.name = new.size_name;
    if not found then
      raise exception 'حجم غير موجود.';
    end if;
  end if;

  new.unit_price := v_price;
  new.name_snapshot := v_name;
  new.category_snapshot := v_category;
  new.restaurant_id := v_restaurant;
  return new;
end;
$$;

drop trigger if exists trg_order_items_before_insert on public.order_items;
create trigger trg_order_items_before_insert
before insert on public.order_items
for each row execute function public.trg_order_items_before_insert();

-- ============================================================
-- 4) بعد كل صنف: حساب الـ subtotal الحقيقي ورفع الـ total لو أقل من المتوقع
--    (بيرفع بس، عمره ما بينزّل total، عشان أي رسوم إضافية من الواجهة تفضل زي ما هي)
-- ============================================================
create or replace function public.trg_order_items_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub numeric;
begin
  select coalesce(sum(i.unit_price * i.quantity), 0)
    into v_sub
  from public.order_items i
  where i.order_id = new.order_id;

  update public.orders o
  set subtotal = v_sub,
      total = greatest(
        coalesce(o.total, 0),
        v_sub
          + coalesce(o.delivery_fee, 0)
          + coalesce(o.additional_restaurant_fee, 0)
          + coalesce(o.doorstep_fee, 0)
          - coalesce(o.discount, 0),
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
-- تأكيد إن التريجرز اتعملت
-- ============================================================
select tgname, tgrelid::regclass as on_table
from pg_trigger
where tgname like 'trg\_order%' and not tgisinternal
order by 2, 1;

-- ============================================================
-- ROLLBACK (لو حصلت مشكلة: شيل علامة -- من الأسطر دي وشغّلها)
-- ============================================================
-- drop trigger if exists trg_orders_before_insert on public.orders;
-- drop trigger if exists trg_orders_before_update on public.orders;
-- drop trigger if exists trg_order_items_before_insert on public.order_items;
-- drop trigger if exists trg_order_items_after_insert on public.order_items;
