import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// مفتاح السيرفر: الجديد (sb_secret) لو موجود، وإلا القديم (مؤقتًا)
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const serviceKey: string = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    // 1) هوية المتصل
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'غير مصرح.' }, 401);
    const { data: caller } = await admin.auth.getUser(token);
    if (!caller.user) return json({ error: 'غير مصرح.' }, 401);

    // 2) المدير الرئيسي، أو أدمن معاه صلاحية إدارة الكباتن
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, can_manage_captains')
      .eq('id', caller.user.id)
      .single();
    const allowed =
      callerProfile?.role === 'primary' ||
      (callerProfile?.role === 'admin' && callerProfile?.can_manage_captains === true);
    if (!allowed) return json({ error: 'غير مصرح.' }, 403);

    // 3) المدخلات
    const body = await req.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!UUID.test(id)) return json({ error: 'معرّف غير صحيح.' }, 400);

    // 4) لازم يكون كابتن (مش أدمن ولا عميل)
    const { data: target } = await admin.from('profiles').select('id, role').eq('id', id).maybeSingle();
    if (!target || target.role !== 'captain') return json({ error: 'الكابتن غير موجود.' }, 404);

    // 5) فك ارتباطه بالأوردرات: النشطة ترجع للتحضير، والمسلّمة تفضل بالاسم والرقم المسجّلين عليها
    await admin
      .from('orders')
      .update({ courier_id: null, courier_name: null, courier_phone: null, status: 'Preparing' })
      .eq('courier_id', id)
      .neq('status', 'Delivered');
    await admin.from('orders').update({ courier_id: null }).eq('courier_id', id);
    await admin.from('reviews').update({ courier_id: null }).eq('courier_id', id);
    await admin.from('captain_locations').delete().eq('captain_id', id);
    await admin.from('notifications').delete().eq('user_id', id);

    // 6) حذف الحساب نفسه
    const { error: deleteError } = await admin.auth.admin.deleteUser(id);
    if (deleteError) {
      console.error('deleteUser failed:', deleteError);
      return json(
        { error: 'تعذر حذف الحساب. لو الكابتن له طلبات مسجلة كعميل، استخدم "إيقاف الحساب" بدل الحذف.' },
        409,
      );
    }
    // لو مفيش cascade على profiles، نمسح الصف يدويًا (مفيش مشكلة لو اتمسح خلاص)
    await admin.from('profiles').delete().eq('id', id);

    return json({ success: true });
  } catch (error) {
    console.error('delete-captain error:', error);
    return json({ error: 'حصل خطأ غير متوقع.' }, 500);
  }
});
