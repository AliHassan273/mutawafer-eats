import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// المفاتيح الجديدة لو موجودة، وإلا القديمة (مؤقتًا لحد ما نقفل القديمة)
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const serviceKey: string = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
const anonKey: string = publishableKeys.default ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const url = Deno.env.get('SUPABASE_URL')!;

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, noSession);

const normalizePhone = (v: unknown) =>
  String(v ?? '')
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\-]/g, '');

const clientIp = (req: Request) =>
  ((req.headers.get('x-forwarded-for') || '').split(',')[0] || req.headers.get('cf-connecting-ip') || 'unknown').trim();

// لو الـ RPC فشلت (مثلًا migration 009 لسه ماتشغّلتش) بنسمح ونسجّل الخطأ بدل ما نوقّف الدخول
async function allowed(key: string, max: number, windowSec: number) {
  const { data, error } = await admin.rpc('rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSec });
  if (error) {
    console.error('rate_limit_hit failed:', error.message);
    return true;
  }
  return data === true;
}

const BAD = 'رقم الهاتف أو كلمة المرور غير صحيحة.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const body = await req.json().catch(() => null);
    const rawPhone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!rawPhone || rawPhone.length > 30 || !password || password.length > 200) return json({ error: BAD }, 401);

    const phone = normalizePhone(rawPhone);
    const ip = clientIp(req);

    const ok =
      (await allowed(`login:ip:${ip}`, 60, 600)) &&
      (await allowed(`login:pi:${phone}:${ip}`, 10, 600)) &&
      (await allowed(`login:p:${phone}`, 60, 3600));
    if (!ok) return json({ error: 'محاولات كتير. استنى شوية وجرّب تاني.' }, 429);

    const variants = [...new Set([rawPhone, phone])];
    const { data: rows } = await admin
      .from('profiles')
      .select('id, name, email, phone, role, status')
      .in('phone', variants)
      .limit(2);
    if (!rows || rows.length !== 1 || !rows[0].email) return json({ error: BAD }, 401);
    const profile = rows[0];

    const client = createClient(url, anonKey, noSession);
    const { data, error } = await client.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.user || !data.session) return json({ error: BAD }, 401);

    if (profile.role === 'captain' && profile.status !== 'approved') {
      return json({ error: 'حساب الطيار لم تتم الموافقة عليه بعد.' }, 403);
    }
    return json({ session: data.session, profile });
  } catch (error) {
    console.error('login-by-phone error:', error);
    return json({ error: 'حصل خطأ غير متوقع.' }, 500);
  }
});
