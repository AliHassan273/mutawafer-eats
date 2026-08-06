import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (v: unknown, status=200) => new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
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
    const aliases = [categoryId, category?.name, category?.nameAr].filter(Boolean);
    const { data: deleted, error: deleteError } = await db.from('menu_items').delete().in('category', aliases).select('id');
    if (deleteError) throw deleteError;
    value.categories = Array.isArray(value.categories) ? value.categories.filter((item: any) => item.id !== categoryId) : [];
    const { error: settingsError } = await db.from('settings').upsert({ key:'main', value, updated_at:new Date().toISOString() });
    if (settingsError) throw settingsError;
    return json({ success: true, deletedItems: deleted?.length || 0 });
  } catch (e) { return json({ error: String(e) }, 400); }
});
