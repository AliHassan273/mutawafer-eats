import { supabase } from '../lib/supabase';

export async function getSettingsFromSupabase() {
  const { data, error } = await supabase.from('settings').select('key,value');
  if (error) throw error;
  const result: any = {};
  for (const row of data || []) result[row.key] = row.value;
  return result.main || result;
}

export async function saveSettingsToSupabase(value: any) {
  const { data: current } = await supabase.from('settings').select('value').eq('key', 'main').maybeSingle();
  const merged = { ...(current?.value || {}), ...value };
  const { error } = await supabase.from('settings').upsert({ key: 'main', value: merged, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteCategoryAndItemsFromSupabase(categoryId: string) {
  const { error: itemsError } = await supabase.from('menu_items').delete().eq('category', categoryId);
  if (itemsError) throw itemsError;
  const { data: current } = await supabase.from('settings').select('value').eq('key', 'main').maybeSingle();
  const next = { ...(current?.value || {}) };
  next.categories = Array.isArray(next.categories) ? next.categories.filter((category: any) => category.id !== categoryId) : [];
  const { error } = await supabase.from('settings').upsert({ key: 'main', value: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}
