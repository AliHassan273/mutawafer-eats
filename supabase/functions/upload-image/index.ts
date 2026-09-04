const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { data, mimeType = 'image/jpeg', fileName = 'image' } = await req.json();
    const cloud = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const preset = Deno.env.get('CLOUDINARY_UPLOAD_PRESET');
    if (!cloud || !preset) return json({ error: 'Cloudinary غير مهيأ: تحقق من CLOUDINARY_CLOUD_NAME وCLOUDINARY_UPLOAD_PRESET.' }, 503);
    if (!data) return json({ error: 'بيانات الصورة غير موجودة.' }, 400);
    if (String(data).length > 12 * 1024 * 1024) return json({ error: 'الصورة كبيرة جدًا.' }, 413);
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));

    // ✅ نحسب بصمة (SHA-256) لمحتوى الصورة نفسه (مش لاسمها) عشان نستخدمها كـ public_id ثابت.
    // نفس الصورة بالظبط (حتى لو من صنف تاني أو وقت تاني) هترجع نفس public_id
    // فـ Cloudinary مش هيرفعها تاني ولا يعمل نسخة جديدة منها.
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const contentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const body = new FormData();
    body.append('file', new Blob([bytes], { type: mimeType }), fileName);
    body.append('upload_preset', preset);
    body.append('folder', 'mutawafer-eats');
    body.append('public_id', contentHash); // ← ثابت بناءً على محتوى الصورة، مش عشوائي
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body });
    const result = await response.json();
    if (!response.ok) return json({ error: result.error?.message || 'Cloudinary رفض رفع الصورة.' }, 502);
    return json({ url: result.secure_url, publicId: result.public_id, existing: result.existing === true });
  } catch (error) { return json({ error: String(error) }, 400); }
});
