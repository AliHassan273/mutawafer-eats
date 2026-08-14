import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (v: unknown, status=200) => new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') || '';
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: user } = await db.auth.getUser(auth.replace('Bearer ', ''));
    if (!user.user) return json({ error: 'غير مصرح.' }, 401);
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.user.id).single();
    if (!['admin','primary'].includes(profile?.role)) return json({ error: 'لا تملك صلاحية حذف التصنيف.' }, 403);
    const { categoryId } = await req.json();
    const { data: settingsRow } = await db.from('settings').select('value').eq('key','main').maybeSingle();
    const value: any = settingsRow?.value || {};
    const category = Array.isArray(value.categories) ? value.categories.find((item: any) => item.id === categoryId) : null;
    // بنطابق بمرونة (تجاهل المسافات وحالة الأحرف) بدل التطابق الحرفي، عشان نمسك كل الأصناف
    // حتى لو كانت متخزنة بأي صيغة من صيغ اسم التصنيف (id أو الاسم الإنجليزي أو العربي)
    const aliases = new Set([categoryId, category?.name, category?.nameAr].filter(Boolean).map(normalize));
    const { data: allItems, error: fetchError } = await db.from('menu_items').select('id, category, restaurant_id');
    if (fetchError) throw fetchError;
    const matchingItems = (allItems || []).filter((item: any) => aliases.has(normalize(item.category)));
    const matchingIds = matchingItems.map((item: any) => item.id);
    const affectedRestaurantIds = Array.from(new Set(matchingItems.map((item: any) => item.restaurant_id).filter(Boolean)));
    let deletedCount = 0;
    if (matchingIds.length) {
      // menu_item_sizes بتتشال تلقائيًا (on delete cascade)، وأي عناصر طلبات قديمة بتتحول لـ NULL بدل ما تتمسح — عشان سجل الطلبات القديمة يفضل سليم
      const { error: deleteError, count } = await db.from('menu_items').delete({ count: 'exact' }).in('id', matchingIds);
      if (deleteError) throw deleteError;
      deletedCount = count || matchingIds.length;
    }
    // نحدّث تصنيفات كل مطعم اتأثر، عشان لو التصنيف المحذوف ده كان آخر تصنيف عنده يتشال من قايمته
    for (const restaurantId of affectedRestaurantIds) {
      const { data: remainingItems } = await db.from('menu_items').select('category').eq('restaurant_id', restaurantId);
      const remainingCategories = Array.from(new Set((remainingItems || []).map((i: any) => i.category).filter(Boolean)));
      await db.from('restaurants').update({ categories: remainingCategories }).eq('id', restaurantId);
    }
    value.categories = Array.isArray(value.categories) ? value.categories.filter((item: any) => item.id !== categoryId) : [];
    const { error: settingsError } = await db.from('settings').upsert({ key:'main', value, updated_at:new Date().toISOString() });
    if (settingsError) throw settingsError;
    return json({ success: true, deletedItems: deletedCount });
  } catch (e) { return json({ error: String(e) }, 400); }
});
