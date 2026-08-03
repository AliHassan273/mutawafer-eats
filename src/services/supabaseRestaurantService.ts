import { supabase } from '../lib/supabase';
import { Restaurant } from '../types';

export async function listRestaurantsFromSupabase(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, menu_items(*, menu_item_sizes(*))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id, name: row.name, rating: Number(row.rating || 0), distance: Number(row.distance || 0),
    deliveryTime: row.delivery_time || '', deliveryFee: Number(row.delivery_fee || 0), promo: row.promo || undefined,
    coverImage: row.cover_image || '', categories: row.categories || [], descriptionString: row.description || '',
    openTime: row.open_time || undefined, closeTime: row.close_time || undefined, whatsappNumber: row.whatsapp_number || undefined,
    menu: (row.menu_items || []).map((item: any) => ({
      id: item.id, name: item.name, description: item.description || '', price: Number(item.price || 0),
      originalPrice: item.original_price == null ? undefined : Number(item.original_price), image: item.image || '', category: item.category || 'أصناف متنوعة',
      sizes: (item.menu_item_sizes || []).map((size: any) => ({ id: size.id, name: size.name, price: Number(size.price || 0), originalPrice: size.original_price == null ? undefined : Number(size.original_price) }))
    }))
  }));
}

export async function listReviewsFromSupabase(): Promise<any[]> {
  const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, orderId: row.order_id, customerName: row.customer_name, restaurantId: row.restaurant_id, restaurantName: row.restaurant_name, courierId: row.courier_id, courierName: row.courier_name, ratingDeliverySpeed: row.rating_delivery_speed, ratingDeliveryManner: row.rating_delivery_manner, ratingFoodQuality: row.rating_food_quality, comment: row.comment, createdAt: row.created_at }));
}

export async function getPublicSettingsFromSupabase(): Promise<any> {
  const { data, error } = await supabase.from('settings').select('key,value');
  if (error) throw error;
  const result: any = {};
  for (const row of data || []) result[row.key] = row.value;
  return result.main || result;
}
