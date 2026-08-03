import { supabase } from '../lib/supabase';
export async function listMyNotifications() { const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50); if (error) throw error; return data || []; }
export async function markNotificationRead(id: string) { const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id); if (error) throw error; }
