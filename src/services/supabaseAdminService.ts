import { supabase } from '../lib/supabase';

export async function saveRestaurantInSupabase(data: any, id?: string) {
  const row = { name: data.name, cover_image: data.coverImage || '', categories: data.categories || [], promo: data.promo || null, delivery_fee: data.deliveryFee || 0, delivery_time: data.deliveryTime || '', rating: data.rating || 0, distance: data.distance || 0, description: data.descriptionString || '', open_time: data.openTime || null, close_time: data.closeTime || null, whatsapp_number: data.whatsappNumber || null };
  const query = id ? supabase.from('restaurants').update(row).eq('id', id).select().single() : supabase.from('restaurants').insert(row).select().single();
  const { data: result, error } = await query;
  if (error) throw error;
  return result;
}

export async function deleteRestaurantInSupabase(id: string) {
  const { error } = await supabase.from('restaurants').delete().eq('id', id);
  if (error) throw error;
}

export async function listAdminOrdersFromSupabase() {
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    userId: row.user_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deliveryAddress: row.delivery_address,
    deliveryFee: row.delivery_fee,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    restaurant: row.restaurant || { id: row.restaurant_id, name: row.restaurant_name || 'المطعم' },
    items: (row.order_items || []).map((item: any) => ({
      restaurantId: item.restaurant_id,
      menuItem: { id: item.menu_item_id, name: item.name_snapshot, description: '', price: item.unit_price, category: item.category_snapshot, image: '' },
      selectedSize: item.size_name ? { name: item.size_name, price: item.unit_price } : undefined,
      quantity: item.quantity,
    })),
  }));
}
export async function listCaptainsFromSupabase() {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'captain').order('created_at', { ascending: false });
  if (error) throw error; return data || [];
}

export async function listAdminProfilesFromSupabase() {
  const { data, error } = await supabase.from('profiles').select('*').in('role', ['admin','primary']).order('created_at', { ascending: false });
  if (error) throw error; return data || [];
}
export async function updateProfilePermissionsInSupabase(id: string, values: any) {
  const { data, error } = await supabase.from('profiles').update({ can_manage_restaurants: !!values.canManageRestaurants, can_manage_menu: !!values.canManageMenu, can_use_ai_scanner: !!values.canUseAIScanner, can_manage_orders: !!values.canManageOrders, can_manage_captains: !!values.canManageCaptains }).eq('id', id).select().single();
  if (error) throw error; return data;
}
export async function updateCaptainStatusInSupabase(id: string, status: string) {
  const { data, error } = await supabase.from('profiles').update({ status }).eq('id', id).select().single();
  if (error) throw error; return data;
}

export async function createAdminInSupabase(input: any) {
  const { data, error } = await supabase.functions.invoke('create-admin', { body: input });
  if (error || data?.error) throw error || new Error(data.error);
  return data;
}

export async function deleteAdminInSupabase(id: string) {
  const { data, error } = await supabase.functions.invoke('delete-admin', { body: { id } });
  if (error || data?.error) throw error || new Error(data.error);
}

export async function listLoyaltyCustomersFromSupabase(threshold = 10) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orders, error } = await supabase.from('orders').select('id,user_id,customer_name,customer_phone,created_at').gte('created_at', since);
  if (error) throw error;
  const grouped = new Map<string, any>();
  for (const order of orders || []) {
    if (!order.user_id) continue;
    const current = grouped.get(order.user_id) || { id: order.user_id, name: order.customer_name || 'عميل', phone: order.customer_phone || '', orderCount: 0, threshold };
    current.orderCount++; grouped.set(order.user_id, current);
  }
  return [...grouped.values()].map(item => ({ ...item, remaining: Math.max(0, threshold - item.orderCount), rewardReady: item.orderCount >= threshold }));
}

export async function deleteCaptainInSupabase(id: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', id).eq('role', 'captain');
  if (error) throw error;
}
