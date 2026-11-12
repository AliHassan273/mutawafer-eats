import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// الدالة بتشتغل في خطوتين، والإيميل عمره ما بيرجع للمتصفح:
//   1) { phone }                        → بتبعت رمز التحقق على الإيميل المسجّل (ردها واحد سواء الرقم موجود أو لأ)
//   2) { phone, code, newPassword }     → بتتحقق من الرمز وتغيّر كلمة السر من السيرفر

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

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

async function allowed(key: string, max: number, windowSec: number) {
  const { data, error } = await admin.rpc('rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSec });
  if (error) {
    console.error('rate_limit_hit failed:', error.message);
    return true;
  }
  return data === true;
}

async function findEmail(rawPhone: string, phone: string): Promise<{ id: string; email: string } | null> {
  const variants = [...new Set([rawPhone, phone])];
  const { data } = await admin.from('profiles').select('id, email').in('phone', variants).limit(2);
  if (!data || data.length !== 1 || !data[0].email) return null;
  return data[0];
}

const BAD_CODE = 'رمز التحقق غير صحيح أو منتهي.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const body = await req.json().catch(() => null);
    const rawPhone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const phone = normalizePhone(rawPhone);
    if (!phone || phone.length > 30) return json({ error: 'اكتب رقم موبايل صحيح.' }, 400);

    const ip = clientIp(req);
    const isReset = body?.code !== undefined || body?.newPassword !== undefined;
    const anon = createClient(url, anonKey, noSession);

    // ───────── الخطوة 1: إرسال الرمز ─────────
    if (!isReset) {
      const ok = (await allowed(`fp:send:ip:${ip}`, 10, 3600)) && (await allowed(`fp:send:p:${phone}`, 3, 3600));
      if (!ok) return json({ error: 'محاولات كتير. جرّب بعد شوية.' }, 429);

      const found = await findEmail(rawPhone, phone);
      if (found) {
        const { error } = await anon.auth.resetPasswordForEmail(found.email);
        if (error) console.error('resetPasswordForEmail failed:', error.message);
      }
      // نفس الرد دايمًا: مايكشفش هل الرقم مسجّل ولا لأ، ومايرجّعش الإيميل
      return json({ success: true });
    }

    // ───────── الخطوة 2: التحقق وتغيير كلمة السر ─────────
    const ok = (await allowed(`fp:reset:ip:${ip}`, 20, 3600)) && (await allowed(`fp:reset:p:${phone}`, 10, 3600));
    if (!ok) return json({ error: 'محاولات كتير. جرّب بعد شوية.' }, 429);

    const code = String(body?.code ?? '').trim();
    const newPassword = String(body?.newPassword ?? '');
    if (!/^[0-9]{4,10}$/.test(code)) return json({ error: BAD_CODE }, 400);
    if (newPassword.length < 6 || newPassword.length > 72) {
      return json({ error: 'كلمة المرور لازم تكون من 6 لـ 72 حرف.' }, 400);
    }

    const found = await findEmail(rawPhone, phone);
    if (!found) return json({ error: BAD_CODE }, 400);

    const { data, error } = await anon.auth.verifyOtp({ email: found.email, token: code, type: 'recovery' });
    if (error || !data.user) return json({ error: BAD_CODE }, 400);

    const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, { password: newPassword });
    if (updateError) {
      console.error('updateUserById failed:', updateError.message);
      return json({ error: 'تعذر تغيير كلمة المرور. جرّب تاني.' }, 400);
    }

    // نقفل كل الجلسات القديمة بعد تغيير كلمة السر
    try {
      if (data.session?.access_token) await admin.auth.admin.signOut(data.session.access_token, 'global');
    } catch (e) {
      console.error('signOut failed:', e);
    }
    return json({ success: true });
  } catch (error) {
    console.error('forgot-password error:', error);
    return json({ error: 'حصل خطأ غير متوقع.' }, 500);
  }
});
