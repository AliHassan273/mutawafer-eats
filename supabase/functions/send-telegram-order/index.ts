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
    const address = String(order.deliveryAddress || 'غير محدد');
    const parts = address.split(' - ');
    const region = parts.length > 1 ? parts[0] : 'غير محددة';
    const detailedAddress = parts.length > 1 ? parts.slice(1).join(' - ') : address;
    const text = [
      '🛒 *طلب جديد من متوفر*',
      '━━━━━━━━━━━━━━━',
      '',
      `👤 *الاسم:* ${order.customerName || 'غير محدد'}`,
      `📱 *الهاتف:* ${order.customerPhone || 'غير محدد'}`,
      `📍 *المنطقة:* ${region}`,
      `🏠 *العنوان:* ${detailedAddress}`,
      '',
      '━━━━━━━━━━━━━━━',
      '📋 *تفاصيل الطلب:*',
      '',
      `🍽️ *اسم المطعم:* ${order.restaurant?.name || order.restaurantName || 'غير محدد'}`,
      ...(order.items || []).map((item: any, index: number) => `${index + 1}. ${item.menuItem?.name || item.name_snapshot || 'صنف'} × ${item.quantity || 1}${item.selectedSize?.name ? ` (${item.selectedSize.name})` : ''}`),
      '',
      '━━━━━━━━━━━━━━━',
      `💰 *المجموع:* ${Number(order.subtotal || 0).toFixed(0)} ج.م`,
      `🚚 *التوصيل:* ${Number(order.deliveryFee || 0).toFixed(0)} ج.م`,
      `✅ *الإجمالي:* ${Number(order.total || 0).toFixed(0)} ج.م`,
    ].join('\n');
    const telegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }) });
    if (!telegram.ok) return new Response(JSON.stringify({ error: await telegram.text() }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return json({ success: true });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
