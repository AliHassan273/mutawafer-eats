const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const responseSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING' },
      description: { type: 'STRING' },
      price: { type: 'NUMBER' },
      originalPrice: { type: 'NUMBER' },
      category: { type: 'STRING' },
      sizes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            price: { type: 'NUMBER' },
          },
          required: ['name', 'price'],
        },
      },
    },
    required: ['name', 'price', 'category'],
  },
};

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
    const prompt = `استخرج كل أصناف قائمة الطعام دي في JSON array. لكل صنف: name (اسم عربي)، description (وصف قصير بالعربية، أو نص فاضي لو مفيش وصف مكتوب فعليًا)، price (أقل سعر متاح للصنف كرقم)، originalPrice (السعر الأصلي قبل الخصم إن وجد)، category (اسم تصنيف عربي مناسب زي حواوشي أو سندوتشات أو مشروبات أو حلويات — استخدم نفس اسم القسم زي ما هو مكتوب بالظبط في الصورة).

قواعد مهمة جدًا للأسعار المتعددة (أعمدة أسعار):
- لو الصنف ليه أكتر من سعر واحد (أكتر من عمود سعر في نفس الصف)، حط كل سعر كعنصر منفصل في sizes، وكل عنصر لازم يكون بالشكل {"name": "...", "price": ...} بالظبط — الاسم ده إلزامي ومينفعش يبقى فاضي.
- لو الأعمدة ليها عناوين مكتوبة فوقها (زي "فينو" و"سوري")، استخدم نفس العنوان بالظبط كـ name لكل حجم.
- لو الأعمدة مفيهاش عناوين مكتوبة خالص، سمّي الأحجام "صغير" و"كبير" بالترتيب من العمود اللي رقمه أصغر للي رقمه أكبر.
- لو الصنف سعر واحد بس، سيب sizes مصفوفة فاضية [] وحط السعر في price مباشرة، من غير ما تكرره كـ size.
- لا تكرر الصنف الأساسي مع أحجامه في عنصر منفصل؛ الأحجام كلها بتتجمع جوه sizes الخاصة بنفس الصنف.

${customInstructions || ''}`;
    const models = [preferredModel, 'gemini-3.1-flash-lite'];
    let lastError = 'فشل تحليل المنيو.';
    for (const model of [...new Set(models)]) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType, data: fileData } }, { text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.1 } }) });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          try {
            const text = result.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || '[]';
            const rawItems = JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, ''));
            // نتأكد إن كل حجم فعلاً له اسم قبل ما نرجّعه للفرونت اند، بدل ما نسيب اسم فاضي يوصل للحفظ
            const items = (Array.isArray(rawItems) ? rawItems : []).map((item: any, itemIdx: number) => ({
              ...item,
              sizes: Array.isArray(item.sizes)
                ? item.sizes
                    .filter((size: any) => size && (size.price !== undefined && size.price !== null))
                    .map((size: any, sizeIdx: number) => ({ ...size, name: String(size.name || '').trim() || `حجم ${sizeIdx + 1}` }))
                : [],
            }));
            return json({ success: true, items, fileName });
          } catch (error) { return json({ error: `تعذر فهم رد الذكاء الاصطناعي — جرّب صورة أوضح أو أقل زحمة (السبب التقني: ${String(error)}).` }, 502); }
        }
        lastError = result.error?.message ? `تعذر تحليل الملف: ${result.error.message}` : `تعذر تحليل الملف باستخدام ${model} (كود الاستجابة: ${response.status}).`;
        if (![429, 500, 502, 503, 504].includes(response.status)) break;
        await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      }
    }
    return json({ error: lastError }, 502);
  } catch (error) { return json({ error: `تعذر معالجة الطلب: ${String(error)}` }, 400); }
});
