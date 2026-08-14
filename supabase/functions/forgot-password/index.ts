import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (v: unknown, status=200) => new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { phone } = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin.from('profiles').select('email').eq('phone', String(phone || '').trim()).maybeSingle();
    if (!profile?.email) return json({ error: 'لا يوجد حساب مسجل بهذا الرقم.' }, 404);
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { error } = await anon.auth.resetPasswordForEmail(profile.email);
    if (error) return json({ error: error.message }, 400);
    return json({ email: profile.email });
  } catch (error) { return json({ error: String(error) }, 400); }
});
