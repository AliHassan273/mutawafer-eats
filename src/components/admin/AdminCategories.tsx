import React from 'react';
import { fetchWithRetry } from '../../utils/fetchHelper';
import { supabaseConfigured } from '../../lib/supabase';
import { saveSettingsToSupabase } from '../../services/supabaseSettingsService';

type Category = { id: string; name: string; nameAr: string; icon: string; visible?: boolean };
export default function AdminCategories({ categories, setCategories, newId, setNewId, newNameAr, setNewNameAr, newIcon, setNewIcon, onSuccess, onRefresh }: any) {
  return <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
    <div><h2 className="text-sm font-black text-slate-800">إدارة التصنيفات 🎨</h2><p className="text-xs text-slate-500 mt-1">عدّل الاسم أو الأيقونة، أظهر أو أخفِ، أو أضف تصنيفًا جديدًا.</p></div>
    <div className="space-y-2">{(categories as Category[]).map((cat, index) => <div key={cat.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center bg-slate-50 rounded-xl p-2">
      <input value={cat.icon} onChange={e => setCategories((list: Category[]) => list.map((x,i) => i === index ? { ...x, icon: e.target.value } : x))} className="w-12 text-center bg-white border rounded-lg px-2 py-1" />
      <input value={cat.nameAr} onChange={e => setCategories((list: Category[]) => list.map((x,i) => i === index ? { ...x, nameAr: e.target.value } : x))} className="bg-white border rounded-lg px-2 py-1 text-xs" />
      <input value={cat.name} onChange={e => setCategories((list: Category[]) => list.map((x,i) => i === index ? { ...x, name: e.target.value } : x))} className="bg-white border rounded-lg px-2 py-1 text-xs" />
      <button type="button" onClick={() => setCategories((list: Category[]) => list.map((x,i) => i === index ? { ...x, visible: x.visible === false } : x))} className={`px-2 py-1 rounded-lg text-[10px] font-black ${cat.visible === false ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>{cat.visible === false ? 'مخفي' : 'ظاهر'}</button>
      {cat.id !== 'all' && <button type="button" onClick={() => setCategories((list: Category[]) => list.filter((_,i) => i !== index))} className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black">حذف</button>}
    </div>)}</div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end border-t pt-3">
      <input value={newId} onChange={e => setNewId(e.target.value.trim().toLowerCase().replace(/\s+/g, '-'))} placeholder="معرف التصنيف" className="border rounded-lg px-2 py-2 text-xs" />
      <input value={newNameAr} onChange={e => setNewNameAr(e.target.value)} placeholder="الاسم بالعربي" className="border rounded-lg px-2 py-2 text-xs" />
      <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="الأيقونة" className="border rounded-lg px-2 py-2 text-xs" />
      <button type="button" onClick={() => { if (!newId || !newNameAr || categories.some((c: Category) => c.id === newId)) return; setCategories((list: Category[]) => [...list, { id: newId, name: newId, nameAr: newNameAr, icon: newIcon || '🍽️', visible: true }]); setNewId(''); setNewNameAr(''); setNewIcon(''); }} className="bg-emerald-600 text-white rounded-lg px-2 py-2 text-xs font-black">إضافة تصنيف</button>
    </div>
    <button type="button" onClick={async () => { if (supabaseConfigured) { await saveSettingsToSupabase({ categories }); onSuccess('تم حفظ التصنيفات على Supabase بنجاح ✅'); if (onRefresh) setTimeout(onRefresh, 500); } else { const res = await fetchWithRetry('/api/settings', { method: 'PUT', body: JSON.stringify({ categories }) }); if (res.ok) { onSuccess('تم حفظ التصنيفات بنجاح ✅'); if (onRefresh) setTimeout(onRefresh, 500); } } }} className="bg-[#f94c10] text-white rounded-xl px-4 py-2 text-xs font-black">حفظ التصنيفات</button>
  </div>;
}
