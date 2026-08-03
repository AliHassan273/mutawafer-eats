import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabaseConfigured, supabase } from '../lib/supabase';
import { listMyNotifications, markNotificationRead } from '../services/supabaseNotificationService';

export default function NotificationBell() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => { if (supabaseConfigured) { try { setItems(await listMyNotifications()); } catch {} } };
  useEffect(() => { load(); if (!supabaseConfigured) return; const channel = supabase.channel('my-notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => setItems(current => [payload.new, ...current])).subscribe(); return () => { supabase.removeChannel(channel); }; }, []);
  if (!supabaseConfigured) return null;
  const unread = items.filter(item => !item.read_at).length;
  return <div className="relative"><button type="button" title="الإشعارات" onClick={async () => { if (unread) { await Promise.all(items.filter(item => !item.read_at).map(item => markNotificationRead(item.id))); setItems(items.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() }))); } }} className="relative h-9 w-9 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm"><Bell className="h-4 w-4" />{unread > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black">{unread}</span>}</button></div>;
}
