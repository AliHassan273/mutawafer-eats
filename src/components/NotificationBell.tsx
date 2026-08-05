import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabaseConfigured, supabase } from '../lib/supabase';
import { listMyNotifications, markNotificationRead } from '../services/supabaseNotificationService';

export default function NotificationBell() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const load = async () => { if (supabaseConfigured) { try { setItems(await listMyNotifications()); } catch {} } };
  useEffect(() => { load(); if (!supabaseConfigured) return; const channel = supabase.channel('my-notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => setItems(current => [payload.new, ...current])).subscribe(); return () => { supabase.removeChannel(channel); }; }, []);
  if (!supabaseConfigured) return null;
  const unread = items.filter(item => !item.read_at).length;
  return <div className="relative">
    <button type="button" title="الإشعارات" onClick={() => setOpen(value => !value)} className="relative h-9 w-9 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm"><Bell className="h-4 w-4" />{unread > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black">{unread}</span>}</button>
    {open && <div className="absolute left-0 top-11 z-[100] w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-3" dir="rtl">
      <h3 className="text-xs font-black text-slate-800 border-b pb-2 mb-2">الإشعارات</h3>
      {!items.length && <p className="text-xs text-slate-400 text-center py-5">لا توجد إشعارات</p>}
      {items.map(item => <button key={item.id} type="button" onClick={async () => { if (!item.read_at) await markNotificationRead(item.id); setItems(current => current.map(x => x.id === item.id ? { ...x, read_at: x.read_at || new Date().toISOString() } : x)); }} className={`block w-full text-right rounded-xl p-2 mb-1 ${item.read_at ? 'bg-slate-50' : 'bg-orange-50'}`}><strong className="block text-xs">{item.title}</strong><span className="block text-[10px] text-slate-500 mt-1">{item.body}</span></button>)}
    </div>}
  </div>;
}
