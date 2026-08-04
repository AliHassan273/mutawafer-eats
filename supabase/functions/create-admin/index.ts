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
  } catch (error) { return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
});
