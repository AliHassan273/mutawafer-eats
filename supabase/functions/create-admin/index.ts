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

// مفتاح السيرفر: الجديد (sb_secret) لو موجود، وإلا القديم (مؤقتًا لحد ما نقفل القديم)
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const serviceKey: string = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// client واحد بصلاحيات السيرفر، من غير هيدر المستخدم
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    // 1) تأكد من هوية المتصل
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'غير مصرح.' }, 401);
    const { data: caller } = await admin.auth.getUser(token);
    if (!caller.user) return json({ error: 'غير مصرح.' }, 401);

    // 2) المدير الرئيسي فقط
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', caller.user.id)
      .single();
    if (callerProfile?.role !== 'primary') {
      return json({ error: 'المدير الرئيسي فقط يستطيع إضافة أدمن.' }, 403);
    }

    // 3) تحقق من المدخلات
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'بيانات غير صحيحة.' }, 400);

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || name.length > 100) return json({ error: 'الاسم غير صحيح.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'الإيميل غير صحيح.' }, 400);
    if (password.length < 10) return json({ error: 'كلمة السر لازم تكون 10 حروف على الأقل.' }, 400);

    const canManageRestaurants = flag(body.canManageRestaurants, true);
    const canManageMenu = flag(body.canManageMenu, true);
    const canUseAIScanner = flag(body.canUseAIScanner, true);

    // 4) إنشاء الحساب (من غير role في الـ metadata)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error || !data.user) {
      console.error('createUser failed:', error);
      return json({ error: 'تعذر إنشاء الحساب (ممكن الإيميل مستخدم).' }, 400);
    }
    const newId = data.user.id;

    // 5) ضبط الصلاحيات من السيرفر فقط، ولو فشل نمسح الحساب
    const { data: updated, error: upErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: newId,
          name,
          email,
          role: 'admin',
          status: 'approved',
          can_manage_restaurants: canManageRestaurants,
          can_manage_menu: canManageMenu,
          can_use_ai_scanner: canUseAIScanner,
        },
        { onConflict: 'id' },
      )
      .select('id');

    if (upErr || !updated?.length) {
      console.error('profile update failed:', upErr);
      await admin.auth.admin.deleteUser(newId);
      return json({ error: 'تعذر ضبط صلاحيات الحساب.' }, 500);
    }

    return json({ success: true, id: newId });
  } catch (error) {
    console.error('create-admin error:', error);
    return json({ error: 'حصل خطأ غير متوقع.' }, 500);
  }
});
