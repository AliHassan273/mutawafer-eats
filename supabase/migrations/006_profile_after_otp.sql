-- إنشاء ملف المستخدم بعد نجاح OTP فقط، مع تجاوز RLS داخل دالة آمنة.
create or replace function public.create_my_profile(
  p_name text,
  p_phone text,
  p_role text default 'customer'
) returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'يجب تأكيد البريد أولاً'; end if;
  insert into public.profiles (id, name, email, phone, role, status)
  values (auth.uid(), coalesce(p_name,''), coalesce((select email from auth.users where id = auth.uid()),''), coalesce(p_phone,''), case when p_role = 'captain' then 'captain' else 'customer' end, case when p_role = 'captain' then 'pending' else 'approved' end)
  on conflict (id) do update set name = excluded.name, phone = excluded.phone, role = excluded.role, status = excluded.status
  returning * into result;
  return result;
end;
$$;

grant execute on function public.create_my_profile(text, text, text) to authenticated;
