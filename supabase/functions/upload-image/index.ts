import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// رفع الصور للأدمن بس (اللي معاه صلاحية المطاعم أو المنيو). بيتحقق من نوع الملف الحقيقي (مش بس الامتداد).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const serviceKey: string = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function allowed(key: string, max: number, windowSec: number) {
  const { data, error } = await admin.rpc('rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSec });
  if (error) {
    console.error('rate_limit_hit failed:', error.message);
    return true;
  }
  return data === true;
}

// نوع الصورة من أول بايتات الملف نفسه
function sniff(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    // 1) أدمن بصلاحية المطاعم أو المنيو
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'غير مصرح.' }, 401);
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth.user) return json({ error: 'غير مصرح.' }, 401);
    const { data: me } = await admin
      .from('profiles')
      .select('id, role, can_manage_restaurants, can_manage_menu')
      .eq('id', auth.user.id)
      .maybeSingle();
    const allowedRole =
      me?.role === 'primary' ||
      (me?.role === 'admin' && (me.can_manage_restaurants === true || me.can_manage_menu === true));
    if (!allowedRole) return json({ error: 'لا تملك صلاحية رفع الصور.' }, 403);
    if (!(await allowed(`upload:${me!.id}`, 60, 3600))) return json({ error: 'تجاوزت حد الرفع (60 صورة في الساعة).' }, 429);

    // 2) الإعدادات
    const cloud = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const preset = Deno.env.get('CLOUDINARY_UPLOAD_PRESET');
    if (!cloud || !preset) return json({ error: 'خدمة الصور غير مهيأة.' }, 503);

    // 3) الصورة
    const body = await req.json().catch(() => null);
    const data = typeof body?.data === 'string' ? body.data : '';
    if (!data) return json({ error: 'بيانات الصورة غير موجودة.' }, 400);
    if (data.length > 12 * 1024 * 1024) return json({ error: 'الصورة كبيرة جدًا.' }, 413);

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    } catch {
      return json({ error: 'الصورة غير صالحة.' }, 400);
    }
    const mimeType = sniff(bytes);
    if (!mimeType) return json({ error: 'نوع الملف غير مدعوم. ارفع صورة JPG أو PNG أو WEBP.' }, 400);

    const safeName = String(body?.fileName ?? 'image').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 60) || 'image';

    // بصمة المحتوى كـ public_id: نفس الصورة مش بتترفع مرتين
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const contentHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mimeType }), safeName);
    form.append('upload_preset', preset);
    form.append('folder', 'mutawafer-eats');
    form.append('public_id', contentHash);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('cloudinary failed:', response.status, result?.error?.message);
      return json({ error: 'تعذر رفع الصورة.' }, 502);
    }
    return json({ url: result.secure_url, publicId: result.public_id, existing: result.existing === true });
  } catch (error) {
    console.error('upload-image error:', error);
    return json({ error: 'حصل خطأ غير متوقع.' }, 500);
  }
});
