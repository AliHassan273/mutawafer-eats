const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { fileData, mimeType, fileName, customInstructions } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const preferredModel = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
    if (!apiKey) return json({ error: 'GEMINI_API_KEY غير مهيأ في Supabase Functions.' }, 503);
    if (!fileData || !mimeType) return json({ error: 'الملف أو نوعه غير موجود.' }, 400);
    if (String(fileData).length > 18 * 1024 * 1024) return json({ error: 'الملف كبير جدًا. استخدم صورة أصغر أو Excel خفيف.' }, 413);
    if (!String(mimeType).startsWith('image/') && mimeType !== 'application/pdf' && mimeType !== 'text/csv' && mimeType !== 'text/plain') return json({ error: 'لتحليل Excel استخدم CSV أو حوّل الملف إلى PDF/صورة.' }, 400);
    const prompt = `استخرج كل أصناف قائمة الطعام في JSON array فقط. الاسم والوصف بالعربية. لكل صنف: name, description, price كرقم, originalPrice إن وجد, category باسم عربي مناسب مثل كريب أو مشروبات أو قهوة أو برجر أو بيتزا أو حلويات، وsizes كمصفوفة أحجام. لا تكرر الصنف الأساسي مع أحجامه؛ اجمع الأحجام في sizes. ${customInstructions || ''}`;
    const models = [preferredModel, 'gemini-3.1-flash-lite'];
    let lastError = 'فشل تحليل المنيو.';
    for (const model of [...new Set(models)]) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType, data: fileData } }, { text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } }) });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          try {
            const text = result.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || '[]';
            const items = JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, ''));
            return json({ success: true, items, fileName });
          } catch (error) { return json({ error: `Gemini أعاد نتيجة غير صالحة: ${String(error)}` }, 502); }
        }
        lastError = result.error?.message || `تعذر تحليل الملف باستخدام ${model}`;
        if (![429, 500, 502, 503, 504].includes(response.status)) break;
        await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      }
    }
    return json({ error: lastError }, 502);
  } catch (error) { return json({ error: String(error) }, 400); }
});
