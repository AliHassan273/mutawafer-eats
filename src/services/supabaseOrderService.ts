import { supabase } from '../lib/supabase';
import { CartItem } from '../types';

export async function createOrderInSupabase(input: { cart: CartItem[]; customerName: string; customerPhone: string; notes?: string; address: string; paymentMethod: string; paymentDetails?: string; deliveryFee: number; additionalRestaurantFee: number; doorstepFee: number; discount: number; total: number; eta?: number }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('يجب تسجيل الدخول قبل إنشاء الطلب.');
  const restaurantIds = [...new Set(input.cart.map(item => item.restaurantId))];
  const { data: order, error } = await supabase.from('orders').insert({ user_id: auth.user.id, restaurant_id: restaurantIds[0], status: 'Received', customer_name: input.customerName, customer_phone: input.customerPhone, delivery_address: input.address, subtotal: input.cart.reduce((sum, item) => sum + (item.selectedSize?.price ?? item.menuItem.price) * item.quantity, 0), delivery_fee: input.deliveryFee, additional_restaurant_fee: input.additionalRestaurantFee, doorstep_fee: input.doorstepFee, discount: input.discount, total: input.total, payment_method: input.paymentMethod, notes: input.notes || '', eta: input.eta || 0 }).select().single();
  if (error || !order) throw error || new Error('تعذر حفظ الطلب.');
  const rows = input.cart.map(item => ({ order_id: order.id, menu_item_id: item.menuItem.id, restaurant_id: item.restaurantId, name_snapshot: item.menuItem.name, category_snapshot: item.menuItem.category, size_name: item.selectedSize?.name || null, unit_price: item.selectedSize?.price ?? item.menuItem.price, quantity: item.quantity }));
  const { error: itemsError } = await supabase.from('order_items').insert(rows);
  if (itemsError) throw itemsError;
  await supabase.functions.invoke('send-telegram-order', { body: { order: { ...order, customerName: input.customerName, customerPhone: input.customerPhone, deliveryAddress: input.address, notes: input.notes || '', total: input.total, deliveryFee: Number(input.deliveryFee || 0) + Number(input.additionalRestaurantFee || 0) + Number(input.doorstepFee || 0), items: input.cart.map((item, index) => ({ ...item, lineNumber: index + 1 })) } } }).catch(() => {});
  try { await supabase.from('notifications').insert({ user_id: auth.user.id, title: 'تم إنشاء طلبك', body: `تم تسجيل الطلب رقم ${order.id} بنجاح.`, type: 'order' }); } catch {}
  return { ...order, userId: order.user_id, customerName: order.customer_name, customerPhone: order.customer_phone, deliveryAddress: order.delivery_address, deliveryFee: order.delivery_fee, subtotal: order.subtotal, discount: order.discount, total: order.total, paymentMethod: order.payment_method, items: input.cart, createdAt: order.created_at, status: order.status, eta: order.eta };
}

function mapOrder(row: any): any {
  return { ...row, userId: row.user_id, customerName: row.customer_name, customerPhone: row.customer_phone, deliveryAddress: row.delivery_address, deliveryFee: row.delivery_fee, additionalRestaurantFee: row.additional_restaurant_fee, doorstepFee: row.doorstep_fee, paymentMethod: row.payment_method, createdAt: row.created_at, restaurant: row.restaurant || { id: row.restaurant_id, name: row.restaurant_name || '' }, items: (row.order_items || []).map((item: any) => ({ restaurantId: item.restaurant_id, restaurantName: item.restaurant_name || '', menuItem: { id: item.menu_item_id, name: item.name_snapshot, description: '', price: item.unit_price, category: item.category_snapshot, image: '' }, selectedSize: item.size_name ? { name: item.size_name, price: item.unit_price } : undefined, quantity: item.quantity })) };
}

export async function listMyOrdersFromSupabase(): Promise<any[]> {
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrder);
}

export async function submitReviewToSupabase(payload: any) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('يجب تسجيل الدخول لإضافة تقييم.');
  const { error } = await supabase.from('reviews').insert({ order_id: payload.orderId, user_id: auth.user.id, restaurant_id: payload.restaurantId, restaurant_name: payload.restaurantName, courier_name: payload.courierName, rating_delivery_speed: payload.ratingDeliverySpeed, rating_delivery_manner: payload.ratingDeliveryManner, rating_food_quality: payload.ratingFoodQuality, comment: payload.comment || '' });
  if (error) throw error;
}

export async function updateOrderStatusInSupabase(orderId: string, update: { status: string; eta?: number; courierName?: string; courierPhone?: string }) {
  const { data, error } = await supabase.from('orders').update({ status: update.status, eta: update.eta ?? 0, courier_id: null }).eq('id', orderId).select().single();
  if (error) throw error;
  return data;
}
