Deno.serve(async (req) => {
  try {
    const { data, mimeType = 'image/jpeg', fileName = 'image' } = await req.json();
    const cloud = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const preset = Deno.env.get('CLOUDINARY_UPLOAD_PRESET');
    if (!cloud || !preset) return new Response(JSON.stringify({ error: 'Cloudinary غير مهيأ.' }), { status: 503 });
    if (!data || String(data).length > 12 * 1024 * 1024) return new Response(JSON.stringify({ error: 'الصورة كبيرة جدًا.' }), { status: 413 });
    const body = new FormData();
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    body.append('file', new Blob([bytes], { type: mimeType }), fileName);
    body.append('upload_preset', preset);
    body.append('folder', 'mutawafer-eats');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body });
    const result = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: result.error?.message || 'فشل رفع الصورة.' }), { status: 502 });
    return new Response(JSON.stringify({ url: result.secure_url, publicId: result.public_id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});
