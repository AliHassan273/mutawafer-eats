import { useEffect, useState } from 'react';
import { fetchWithRetry } from '../utils/fetchHelper';
import { supabaseConfigured, supabase } from '../lib/supabase';

export function useLoyalty(currentUser: any, orders: any[], settings: any) {
  const [loyaltyStatus, setLoyaltyStatus] = useState<any>(null);
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'primary') {
      setLoyaltyStatus(null);
      return;
    }
    const load = async () => {
      if (supabaseConfigured) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase.from('orders').select('id').eq('user_id', currentUser.id).gte('created_at', since);
        if (error) throw error;
        const threshold = Math.max(1, Number(settings.rewardOrderThreshold) || 10);
        const count = (data || []).length;
        setLoyaltyStatus({ count, threshold, remaining: Math.max(0, threshold - count), rewardReady: count >= threshold, rewardMessage: 'مبروك! وصلت لعدد الطلبات المطلوب. تواصل معنا على واتساب لاستلام هديتك.' });
        return;
      }
      const res = await fetchWithRetry('/api/loyalty/me');
      if (res.ok) { setLoyaltyStatus(await res.json()); return; }
      throw new Error('loyalty unavailable');
    };
    load().catch(() => {
      const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const count = orders.filter(o => (o.userId === currentUser.id || o.customerPhone === currentUser.phone) && Date.parse(o.createdAt || '') >= since).length;
      const threshold = Math.max(1, Number(settings.rewardOrderThreshold) || 10);
      setLoyaltyStatus({ count, threshold, remaining: Math.max(0, threshold - count), rewardReady: count >= threshold, rewardMessage: 'مبروك! وصلت لعدد الطلبات المطلوب. تواصل معنا على واتساب لاستلام هديتك.' });
    });
  }, [currentUser, orders.length, settings.rewardOrderThreshold]);
  return loyaltyStatus;
}
