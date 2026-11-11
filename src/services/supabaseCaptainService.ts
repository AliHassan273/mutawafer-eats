import { supabase } from '../lib/supabase';

// الكتابة على captain_locations بقت من دوال Supabase بس (بتتأكد إن الأوردر مسند للكابتن).
export async function saveCaptainLocation(location: { lat: number; lng: number; orderId?: string }) {
  const { error } = await supabase.rpc('update_captain_location', {
    p_order_id: location.orderId || null,
    p_lat: location.lat,
    p_lng: location.lng,
  });
  if (error) throw error;
}

export async function removeCaptainLocation() {
  await supabase.rpc('remove_captain_location');
}

export async function getOrderCaptainLocation(orderId: string) {
  const { data, error } = await supabase.from('captain_locations').select('*').eq('order_id', orderId).maybeSingle();
  if (error) throw error;
  return data ? { lat: Number(data.lat), lng: Number(data.lng), updatedAt: data.updated_at } : null;
}
