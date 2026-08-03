import { supabase } from '../lib/supabase';

export async function saveCaptainLocation(location: { lat: number; lng: number; orderId?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('يجب تسجيل الدخول.');
  const { error } = await supabase.from('captain_locations').upsert({ captain_id: auth.user.id, order_id: location.orderId || null, lat: location.lat, lng: location.lng, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function removeCaptainLocation() {
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) await supabase.from('captain_locations').delete().eq('captain_id', auth.user.id);
}

export async function getOrderCaptainLocation(orderId: string) {
  const { data, error } = await supabase.from('captain_locations').select('*').eq('order_id', orderId).maybeSingle();
  if (error) throw error;
  return data ? { lat: Number(data.lat), lng: Number(data.lng), updatedAt: data.updated_at } : null;
}
