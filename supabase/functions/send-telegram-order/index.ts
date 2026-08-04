import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { order } = await req.json();
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return json({ skipped: true });
    const text = [
      '🛎️ طلب جديد',
      `رقم الطلب: ${order.id}`,
      `العميل: ${order.customerName || 'غير محدد'}`,
      `الهاتف: ${order.customerPhone || 'غير محدد'}`,
      `العنوان: ${order.deliveryAddress || 'غير محدد'}`,
      `الإجمالي: ${order.total} جنيه`,
      ...(order.items || []).map((item: any) => `• ${item.menuItem?.name || 'صنف'} × ${item.quantity}`),
    ].join('\n');
    const telegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }) });
    if (!telegram.ok) return new Response(JSON.stringify({ error: await telegram.text() }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return json({ success: true });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
