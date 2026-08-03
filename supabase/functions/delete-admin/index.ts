import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: caller } = await client.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller.user) return new Response(JSON.stringify({ error: 'غير مصرح.' }), { status: 401 });
    const { data: profile } = await client.from('profiles').select('role').eq('id', caller.user.id).single();
    if (profile?.role !== 'primary') return new Response(JSON.stringify({ error: 'المدير الرئيسي فقط يستطيع حذف الأدمن.' }), { status: 403 });
    const { id } = await req.json();
    if (!id || id === caller.user.id) return new Response(JSON.stringify({ error: 'لا يمكن حذف الحساب الحالي.' }), { status: 400 });
    const { error } = await client.auth.admin.deleteUser(id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) { return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
});
