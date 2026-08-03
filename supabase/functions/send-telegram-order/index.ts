import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const { order } = await req.json();
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return new Response(JSON.stringify({ skipped: true }), { headers: { 'Content-Type': 'application/json' } });
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
    if (!telegram.ok) return new Response(JSON.stringify({ error: await telegram.text() }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});
