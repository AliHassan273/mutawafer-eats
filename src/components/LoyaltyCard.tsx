import React from 'react';

export default function LoyaltyCard({ loyaltyStatus, whatsappNumber }: any) {
  if (!loyaltyStatus) return null;
  return (
    <section className={`mx-4 md:mx-8 rounded-3xl p-5 border shadow-sm ${loyaltyStatus.rewardReady ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`} dir="rtl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800">عداد طلباتك خلال آخر ٣٠ يومًا 🎁</h2>
          <p className="text-xs text-slate-500 mt-1">طلبت <strong>{loyaltyStatus.count}</strong> من <strong>{loyaltyStatus.threshold}</strong> طلبات للوصول إلى الهدية.</p>
          {loyaltyStatus.rewardReady && <p className="text-xs text-amber-700 font-black mt-2">{loyaltyStatus.rewardMessage}</p>}
        </div>
        {loyaltyStatus.rewardReady ? (
          <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(loyaltyStatus.rewardMessage)}`} target="_blank" rel="noreferrer" className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-black">تواصل معنا على واتساب 🎁</a>
        ) : <span className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black">متبقي {loyaltyStatus.remaining} طلب</span>}
      </div>
    </section>
  );
}
