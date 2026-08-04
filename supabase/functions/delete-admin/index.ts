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
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: caller } = await client.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller.user) return new Response(JSON.stringify({ error: 'غير مصرح.' }), { status: 401 });
    const { data: profile } = await client.from('profiles').select('role').eq('id', caller.user.id).single();
    if (profile?.role !== 'primary') return new Response(JSON.stringify({ error: 'المدير الرئيسي فقط يستطيع حذف الأدمن.' }), { status: 403 });
    const { id } = await req.json();
    if (!id || id === caller.user.id) return new Response(JSON.stringify({ error: 'لا يمكن حذف الحساب الحالي.' }), { status: 400 });
    const { error } = await client.auth.admin.deleteUser(id);
    if (error) throw error;
    return json({ success: true });
  } catch (error) { return new Response(JSON.stringify({ error: String(error) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
});
