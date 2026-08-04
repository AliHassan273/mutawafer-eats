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
  const { data: current } = await supabase.from('settings').select('value').eq('key', 'main').maybeSingle();
  const next = { ...(current?.value || {}) };
  const category = Array.isArray(next.categories) ? next.categories.find((item: any) => item.id === categoryId) : null;
  const aliases = [categoryId, category?.name, category?.nameAr].filter(Boolean);
  const { error: itemsError } = await supabase.from('menu_items').delete().in('category', aliases);
  if (itemsError) throw itemsError;
  next.categories = Array.isArray(next.categories) ? next.categories.filter((item: any) => item.id !== categoryId) : [];
  const { error } = await supabase.from('settings').upsert({ key: 'main', value: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}
