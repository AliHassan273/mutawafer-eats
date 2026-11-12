import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// الدالة بتاخد رقم الأوردر بس (orderId)، وبتقرا كل البيانات من الداتابيز بنفسها.
// مفيش حاجة بتيجي من المتصفح بتدخل الرسالة، فمحدش يقدر يزوّر أوردر أو يبعت رسايل وهمية.

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function allowed(key: string, max: number, windowSec: number) {
  const { data, error } = await admin.rpc('rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSec });
  if (error) {
    console.error('rate_limit_hit failed:', error.message);
    return true;
  }
  return data === true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    // 1) هوية المتصل
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'غير مصرح.' }, 401);
    const { data: auth } = await admin.auth.getUser(token);
    const user = auth.user;
    if (!user) return json({ error: 'غير مصرح.' }, 401);

    const body = await req.json().catch(() => null);
    const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
    if (!UUID.test(orderId)) return json({ error: 'رقم طلب غير صحيح.' }, 400);

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!botToken || !chatId) return json({ skipped: true });

    // 2) الأوردر لازم يكون بتاع المتصل (أو المتصل أدمن)
    const { data: order } = await admin.from('orders').select('*, order_items(*)').eq('id', orderId).maybeSingle();
    if (!order) return json({ error: 'الطلب غير موجود.' }, 404);
    if (order.user_id !== user.id) {
      const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!['admin', 'primary'].includes(me?.role)) return json({ error: 'غير مصرح.' }, 403);
    }

    // 3) أوردرات جديدة بس، ومرة واحدة لكل أوردر
    if (Date.now() - Date.parse(order.created_at) > 15 * 60 * 1000) return json({ skipped: true });
    if (!(await allowed(`tg:order:${orderId}`, 1, 86400))) return json({ skipped: true });
    if (!(await allowed(`tg:user:${user.id}`, 20, 3600))) return json({ error: 'محاولات كتير.' }, 429);

    const { data: restaurant } = await admin.from('restaurants').select('name').eq('id', order.restaurant_id).maybeSingle();

    const address = String(order.delivery_address || 'غير محدد');
    const parts = address.split(' - ');
    const region = parts.length > 1 ? parts[0] : 'غير محددة';
    const detailedAddress = parts.length > 1 ? parts.slice(1).join(' - ') : address;
    const deliveryTotal =
      Number(order.delivery_fee || 0) + Number(order.additional_restaurant_fee || 0) + Number(order.doorstep_fee || 0);

    const items: any[] = Array.isArray(order.order_items) ? order.order_items : [];
    const text = [
      '🛒 <b>طلب جديد من متوفر</b>',
      '━━━━━━━━━━━━━━━',
      '',
      `👤 <b>الاسم:</b> ${esc(order.customer_name || 'غير محدد')}`,
      `📱 <b>الهاتف:</b> ${esc(order.customer_phone || 'غير محدد')}`,
      `📍 <b>المنطقة:</b> ${esc(region)}`,
      `🏠 <b>العنوان:</b> ${esc(detailedAddress)}`,
      `📝 <b>ملاحظات:</b> ${esc(order.notes || 'لا توجد')}`,
      '',
      '━━━━━━━━━━━━━━━',
      '📋 <b>تفاصيل الطلب:</b>',
      '',
      `🍽️ <b>اسم المطعم:</b> ${esc(restaurant?.name || 'غير محدد')}`,
      ...items.map(
        (item, i) =>
          `${i + 1}. ${esc(item.name_snapshot || 'صنف')} × ${Number(item.quantity) || 1}${item.size_name ? ` (${esc(item.size_name)})` : ''}`,
      ),
      '',
      '━━━━━━━━━━━━━━━',
      `💳 <b>الدفع:</b> ${esc(order.payment_method || 'غير محدد')}`,
      `💰 <b>المجموع:</b> ${Number(order.subtotal || 0).toFixed(0)} ج.م`,
      `🚚 <b>التوصيل:</b> ${deliveryTotal.toFixed(0)} ج.م`,
      `✅ <b>الإجمالي:</b> ${Number(order.total || 0).toFixed(0)} ج.م`,
    ].join('\n');

    const telegram = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!telegram.ok) {
      console.error('telegram failed:', telegram.status, await telegram.text());
      return json({ error: 'تعذر إرسال الإشعار.' }, 502);
    }
    return json({ success: true });
  } catch (error) {
    console.error('send-telegram-order error:', error);
    return json({ error: 'حصل خطأ غير متوقع.' }, 500);
  }
});
