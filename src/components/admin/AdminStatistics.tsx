import React from 'react';

export default function AdminStatistics({ orders, restaurants }: { orders: any[]; restaurants: any[] }) {
  const total = orders.length;
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const delivered = orders.filter(order => order.status === 'Delivered').length;
  const active = orders.filter(order => !['Delivered'].includes(order.status)).length;
  const cards = [
    ['إجمالي الطلبات', total, '📦', 'bg-blue-50 text-blue-700'],
    ['إجمالي المبيعات', `${revenue.toFixed(0)} جنيه`, '💰', 'bg-emerald-50 text-emerald-700'],
    ['طلبات قيد التنفيذ', active, '🛵', 'bg-amber-50 text-amber-700'],
    ['طلبات مكتملة', delivered, '✅', 'bg-purple-50 text-purple-700'],
    ['المطاعم', restaurants.length, '🏪', 'bg-orange-50 text-orange-700'],
  ];
  return <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">{cards.map(([label, value, icon, color]) => <div key={String(label)} className={`${color} rounded-2xl p-4 border border-white shadow-sm`}><div className="text-xl">{icon}</div><div className="text-[10px] font-bold mt-2 opacity-80">{label}</div><strong className="text-lg font-black">{value}</strong></div>)}</div>;
}
