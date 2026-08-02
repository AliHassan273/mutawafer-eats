import React from 'react';
import { fetchWithRetry } from '../../utils/fetchHelper';

export default function AdminLoyalty({ rewardOrderThreshold, setRewardOrderThreshold, loyaltyCustomers, onSuccess }: any) {
  return (
          <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-black text-slate-800">نظام هدايا العملاء 🎁</h2><p className="text-xs text-slate-500 mt-1">يُحسب عدد الطلبات لكل عميل خلال آخر ٣٠ يومًا فقط.</p></div>
              <input type="number" min="1" value={rewardOrderThreshold} onChange={e => setRewardOrderThreshold(Math.max(1, Number(e.target.value) || 1))} className="w-24 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center font-black" />
            </div>
            <p className="text-[10px] text-slate-400">عند الوصول إلى هذا العدد، تظهر للعميل رسالة الهدية وزر التواصل عبر واتساب.</p>
            <button type="button" onClick={async () => {
              const res = await fetchWithRetry('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rewardOrderThreshold: Math.max(1, Number(rewardOrderThreshold) || 10) }) });
              if (res.ok) onSuccess('تم حفظ عدد الطلبات المطلوب للهدية.');
            }} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 text-xs font-black">حفظ عدد الطلبات</button>
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-xs text-right"><thead className="bg-slate-50"><tr><th className="p-3">العميل</th><th className="p-3">الهاتف</th><th className="p-3">طلبات آخر ٣٠ يوم</th><th className="p-3">الحالة</th></tr></thead><tbody>
                {loyaltyCustomers.map(c => <tr key={c.id} className="border-t border-slate-100"><td className="p-3 font-bold">{c.name}</td><td className="p-3" dir="ltr">{c.phone || '—'}</td><td className="p-3 font-black">{c.orderCount} / {c.threshold}</td><td className={`p-3 font-black ${c.rewardReady ? 'text-emerald-600' : 'text-slate-500'}`}>{c.rewardReady ? 'مستحق الهدية 🎁' : `متبقي ${c.remaining}`}</td></tr>)}
                {!loyaltyCustomers.length && <tr><td colSpan={4} className="p-5 text-center text-slate-400">لا توجد طلبات لعملاء خلال آخر ٣٠ يومًا.</td></tr>}
              </tbody></table>
            </div>
          </div>
  );
}
