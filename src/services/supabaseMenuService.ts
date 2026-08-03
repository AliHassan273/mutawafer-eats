import { supabase } from '../lib/supabase';

export async function addMenuItemsToSupabase(restaurantId: string, items: any[]) {
  const rows = items.map(item => ({ restaurant_id: restaurantId, name: item.name, description: item.description || '', price: Number(item.price || 0), original_price: item.originalPrice ?? null, image: item.image || '', category: item.category || 'أصناف متنوعة' }));
  const { data, error } = await supabase.from('menu_items').insert(rows).select();
  if (error) throw error;
  for (let i = 0; i < (data || []).length; i++) {
    const sizes = Array.isArray(items[i].sizes) ? items[i].sizes : [];
    if (sizes.length) {
      const { error: sizeError } = await supabase.from('menu_item_sizes').insert(sizes.map((size: any) => ({ menu_item_id: data[i].id, name: size.name, price: Number(size.price || 0), original_price: size.originalPrice ?? null })));
      if (sizeError) throw sizeError;
    }
  }
  return data || [];
}

export async function updateMenuItemInSupabase(itemId: string, item: any) {
  const { data, error } = await supabase.from('menu_items').update({ name: item.name, description: item.description || '', price: Number(item.price || 0), original_price: item.originalPrice ?? null, image: item.image || '', category: item.category || 'أصناف متنوعة' }).eq('id', itemId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMenuItemFromSupabase(itemId: string) {
  const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
  if (error) throw error;
}
