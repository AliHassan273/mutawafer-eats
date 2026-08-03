import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: caller } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller.user) return new Response(JSON.stringify({ error: 'غير مصرح.' }), { status: 401 });
    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.user.id).single();
    if (callerProfile?.role !== 'primary') return new Response(JSON.stringify({ error: 'المدير الرئيسي فقط يستطيع إضافة أدمن.' }), { status: 403 });
    const { name, email, password, canManageRestaurants = true, canManageMenu = true, canUseAIScanner = true } = await req.json();
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role: 'admin' } });
    if (error || !data.user) throw error || new Error('تعذر إنشاء الحساب.');
    await supabase.from('profiles').update({ name, role: 'admin', status: 'approved', can_manage_restaurants: canManageRestaurants, can_manage_menu: canManageMenu, can_use_ai_scanner: canUseAIScanner }).eq('id', data.user.id);
    return new Response(JSON.stringify({ success: true, id: data.user.id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) { return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
});
