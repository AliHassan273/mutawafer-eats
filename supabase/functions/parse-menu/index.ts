
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { fileData, mimeType, fileName, customInstructions } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
    if (!apiKey) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY غير مهيأ.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!fileData || !mimeType) return new Response(JSON.stringify({ error: 'الملف أو نوعه غير موجود.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const prompt = `استخرج كل أصناف قائمة الطعام في JSON array فقط. الاسم والوصف بالعربية. لكل صنف: name, description, price كرقم, originalPrice إن وجد, category باسم عربي مناسب مثل كريب أو مشروبات أو قهوة أو برجر أو بيتزا أو حلويات، وsizes كمصفوفة أحجام. لا تكرر الصنف الأساسي مع أحجامه؛ اجمع الأحجام في sizes. ${customInstructions || ''}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType, data: fileData } }, { text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }) });
    const result = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: result.error?.message || 'فشل تحليل المنيو.' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const text = result.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || '[]';
    const items = JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, ''));
    return json({ success: true, items, fileName });
  } catch (error) { return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
});
