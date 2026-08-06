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
  if (Array.isArray(value.categories)) {
    const rows = value.categories.map((category: any) => ({ id: String(category.id), name: String(category.name || category.id), name_ar: String(category.nameAr || category.name || category.id), icon: category.icon || '🍽️', visible: category.visible !== false }));
    if (rows.length) { const { error: categoryError } = await supabase.from('categories').upsert(rows); if (categoryError) throw categoryError; }
  }
}

export async function deleteCategoryAndItemsFromSupabase(categoryId: string) {
  const { data, error } = await supabase.functions.invoke('delete-category', { body: { categoryId } });
  if (error || data?.error) throw error || new Error(data.error);
  return data;
}
