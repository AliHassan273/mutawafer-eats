import { supabase } from '../lib/supabase';

export async function getSettingsFromSupabase() {
  const { data, error } = await supabase.from('settings').select('key,value');
  if (error) throw error;
  const result: any = {};
  for (const row of data || []) result[row.key] = row.value;
  return result.main || result;
}

export async function saveSettingsToSupabase(value: any) {
  const { error } = await supabase.from('settings').upsert({ key: 'main', value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
