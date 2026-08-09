import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (v: unknown, status=200) => new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') || '';
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: user } = await admin.auth.getUser(auth.replace('Bearer ', ''));
    if (!user.user) return json({ error: 'غير مصرح.' }, 401);
    const input = await req.json();
    const profile = { id: user.user.id, name: input.name || user.user.user_metadata?.name || '', email: user.user.email || input.email || '', phone: input.phone || user.user.user_metadata?.phone || '', role: input.role === 'captain' ? 'captain' : 'customer', status: input.role === 'captain' ? 'pending' : 'approved' };
    const { error } = await admin.from('profiles').upsert(profile, { onConflict: 'id' });
    if (error) return json({ error: error.message }, 400);
    return json({ success: true, profile });
  } catch (e) { return json({ error: String(e) }, 400); }
});
