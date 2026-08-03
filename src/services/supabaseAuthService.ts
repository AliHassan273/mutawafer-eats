import { supabase } from '../lib/supabase';

export async function signInWithSupabase(email: string, password: string) {
  const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !auth.user) throw error || new Error('بيانات الدخول غير صحيحة.');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
  return profile || { id: auth.user.id, name: auth.user.user_metadata?.name || '', email: auth.user.email || email, phone: auth.user.user_metadata?.phone || '', role: auth.user.user_metadata?.role || 'customer', status: 'approved' };
}

export async function signUpWithSupabase(input: { name: string; email: string; phone: string; password: string; role: string }) {
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password, options: { data: { name: input.name, phone: input.phone, role: input.role } } });
  if (error) throw error;
  if (!data.user) throw new Error('تعذر إنشاء الحساب.');
  return { user: data.user, session: data.session };
}

export async function signOutSupabase() { await supabase.auth.signOut(); }
