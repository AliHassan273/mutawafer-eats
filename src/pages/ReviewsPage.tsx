import React from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { Review } from '../types';

export default function ReviewsPage({ reviews, onBack }: { reviews: Review[]; onBack: () => void }) {
  const ordered = [...reviews].sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  return <div className="max-w-7xl mx-auto px-4 md:px-8 py-6" dir="rtl">
    <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4 rotate-180" /> العودة</button>
    <h1 className="text-2xl font-black text-slate-800 mb-6">كل آراء العملاء 🗣️</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{ordered.map(review => <article key={review.id} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm"><div className="flex justify-between"><strong>{review.customerName || 'عميل'}</strong><span className="text-amber-500">⭐ {(((review.ratingFoodQuality || 5) + (review.ratingDeliverySpeed || 5) + (review.ratingDeliveryManner || 5)) / 3).toFixed(1)}</span></div><p className="text-xs text-slate-500">{review.restaurantName}</p><p className="text-sm text-slate-700 leading-7">{review.comment || 'بدون تعليق'}</p><time className="text-[10px] text-slate-400">{new Date(review.createdAt).toLocaleString('ar-EG')}</time></article>)}</div>
  </div>;
}
