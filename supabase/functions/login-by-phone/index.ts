import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (v: unknown, status=200) => new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { phone, password } = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin.from('profiles').select('*').eq('phone', String(phone || '').trim()).maybeSingle();
    if (!profile?.email) return json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data, error } = await client.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.user || !data.session) return json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' }, 401);
    if (profile.role === 'captain' && profile.status !== 'approved') return json({ error: 'حساب الطيار لم تتم الموافقة عليه بعد.' }, 403);
    return json({ session: data.session, profile });
  } catch (error) { return json({ error: String(error) }, 400); }
});
