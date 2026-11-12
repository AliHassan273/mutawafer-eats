import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const serviceKey: string = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// client واحد بمفتاح السيرفر بس (القديم كان بيخلط مفتاح السيرفر مع توكن المستخدم)
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'غير مصرح.' }, 401);
    const { data: caller } = await admin.auth.getUser(token);
    if (!caller.user) return json({ error: 'غير مصرح.' }, 401);

    const { data: me } = await admin.from('profiles').select('role').eq('id', caller.user.id).maybeSingle();
    if (me?.role !== 'primary') return json({ error: 'المدير الرئيسي فقط يستطيع حذف الأدمن.' }, 403);

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!UUID.test(id)) return json({ error: 'معرّف غير صحيح.' }, 400);
    if (id === caller.user.id) return json({ error: 'لا يمكن حذف الحساب الحالي.' }, 400);

    // لازم يكون أدمن عادي (مش مدير رئيسي، ومش عميل أو كابتن)
    const { data: target } = await admin.from('profiles').select('id, role').eq('id', id).maybeSingle();
    if (!target || target.role !== 'admin') return json({ error: 'الأدمن غير موجود.' }, 404);

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      console.error('deleteUser failed:', error);
      return json({ error: 'تعذر حذف الحساب.' }, 400);
    }
    // الـ profile بيتمسح تلقائيًا (cascade). والأوردرات القديمة بتفضل (user_id/courier_id بتبقى null)
    return json({ success: true });
  } catch (error) {
    console.error('delete-admin error:', error);
    return json({ error: 'حصل خطأ غير متوقع.' }, 500);
  }
});
