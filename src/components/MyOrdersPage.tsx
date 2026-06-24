import React from 'react';
import { Clock, MapPin, ChevronRight, CheckCircle2, Star, RefreshCw, ShoppingBag } from 'lucide-react';
import { Order, Review } from '../types';
import { Language } from '../translations';

interface MyOrdersPageProps {
  orders: Order[];
  currentUser: { id: string; name: string; email: string; phone: string; role?: string } | null;
  onOrderClick: (order: Order) => void;
  lang: Language;
  onBack: () => void;
  reviews?: Review[];
}

export default function MyOrdersPage({
  orders,
  currentUser,
  onOrderClick,
  lang,
  onBack,
  reviews = [],
}: MyOrdersPageProps) {
  const isAr = lang === 'ar';

  const t = (arText: string, enText: string) => (isAr ? arText : enText);

  // Load guest order IDs from localStorage
  const getGuestOrderIds = (): string[] => {
    try {
      const stored = localStorage.getItem('mutafer_customer_order_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Filter orders:
  // 1. Within the last 30 days (1 month)
  // 2. Matches user phone OR is saved as guest order in localStorage
  const userOrders = React.useMemo(() => {
    const guestIds = getGuestOrderIds();
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    return orders.filter((o) => {
      // Date boundary check (last month)
      const orderDate = new Date(o.createdAt);
      if (orderDate < oneMonthAgo) return false;

      // Ownership check
      const matchesPhone = currentUser && o.customerPhone === currentUser.phone;
      const matchesGuestId = guestIds.includes(o.id);

      return matchesPhone || matchesGuestId;
    });
  }, [orders, currentUser]);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-100 uppercase tracking-wider flex items-center gap-1">
            <span>⏳</span>
            <span>{t('قيد المراجعة', 'Pending')}</span>
          </span>
        );
      case 'Received':
        return (
          <span className="bg-sky-50 text-sky-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-sky-100 uppercase tracking-wider flex items-center gap-1">
            <span>👍</span>
            <span>{t('تم الاستلام', 'Received')}</span>
          </span>
        );
      case 'Preparing':
        return (
          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wider flex items-center gap-1 animate-pulse">
            <span>👨‍🍳</span>
            <span>{t('جاري التحضير', 'Preparing')}</span>
          </span>
        );
      case 'OutForDelivery':
        return (
          <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-orange-100 uppercase tracking-wider flex items-center gap-1 animate-bounce">
            <span>🛵</span>
            <span>{t('مع طيار التوصيل', 'Out for Delivery')}</span>
          </span>
        );
      case 'Delivered':
        return (
          <span className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-green-100 uppercase tracking-wider flex items-center gap-1">
            <span>✓</span>
            <span>{t('تم التوصيل', 'Delivered')}</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-250" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header back button row */}
      <div className={`flex items-center justify-between`}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors bg-white hover:bg-slate-50 py-2 px-4 rounded-xl border border-slate-150 shadow-xs cursor-pointer active:scale-95 duration-150"
        >
          <ChevronRight className={`h-4 w-4 ${isAr ? '' : 'rotate-180'}`} />
          <span>{t('العودة للرئيسية', 'Back to Home')}</span>
        </button>

        <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 font-display flex items-center gap-2">
          <span>📋</span>
          <span>{t('قائمة طلباتي', 'My Orders Activity')}</span>
        </h1>
      </div>

      {/* Description Info Banner */}
      <div className="bg-gradient-to-br from-orange-50/40 to-amber-50/25 border border-orange-105 rounded-2xl p-4 flex gap-3 text-xs text-slate-600 leading-relaxed font-semibold">
        <span className="text-xl shrink-0">✨</span>
        <p>
          {t(
            'تظهر هنا كافة طلباتك السابقة والنشطة التي قمت بطلبها خلال الثلاثين يوماً الماضية، يمكنك تتبع الطلب الجاري فوراً ومتابعة خط سير الطيار، أو مراجعة وتقييم الوجبات بعد استلامها.',
            'Here are all your active and historic orders from the last 30 days. Easily track in-progress orders coordinates and leave helpful feedback for older ones.'
          )}
        </p>
      </div>

      {/* Orders List View */}
      {userOrders.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl p-8 space-y-4 shadow-xs">
          <div className="bg-orange-50 h-14 w-14 rounded-full flex items-center justify-center text-[#f94c10] mx-auto text-2xl">
            🧺
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-extrabold text-slate-800 text-base">
              {t('لم تقم بأي طلبات أكل بعد!', 'No orders placed yet!')}
            </h3>
            <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
              {t(
                'اطلب أكلتك المفضلة الآن من أكبر مطاعم مسافر وسيظهر سجل طلباتك وتتبع الطيار هنا فوراً.',
                'Order your delicious meal first! Your full tracking status and order archives will populate here.'
              )}
            </p>
          </div>
          <button
            onClick={onBack}
            className="bg-[#f94c10] hover:bg-orange-600 text-white font-extrabold text-xs py-2.5 px-6 rounded-2xl transition-all shadow-md hover:scale-102 active:scale-98 cursor-pointer"
          >
            {t('تصفح المطاعم واطلب الآن 🍔', 'Explore Restaurants Now 🍔')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {userOrders.map((order) => {
            const hasBeenReviewed = order.reviewed || reviews.some((r) => r.orderId === order.id);

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-150 hover:border-orange-200 rounded-3xl p-5 shadow-xs transition-all duration-200 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Details Column */}
                <div className="space-y-3.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-50/75 h-10 w-10 rounded-2xl flex items-center justify-center text-[#f94c10] text-[18px] shrink-0 font-bold border border-orange-100">
                      🏢
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold text-base text-slate-800 truncate leading-tight">
                        {order.restaurant.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 inline-flex items-center gap-1 font-mono" style={{ direction: 'ltr' }}>
                        <Clock className="h-3 w-3" />
                        <span>{new Date(order.createdAt).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                  </div>

                  {/* Order items lists in line */}
                  <div className="bg-slate-50/75 border border-slate-100 rounded-2xl p-3 text-xs font-semibold text-slate-600 line-clamp-2 max-w-xl">
                    <span className="font-extrabold text-slate-800 block mb-1">
                      {t('مكونات هذا الطلب 📦:', 'Order Content 📦:')}
                    </span>
                    <span className="leading-relaxed text-slate-500">
                       {order.items.map((it) => {
                        const sizeSuffix = it.selectedSize ? ` (${it.selectedSize.name})` : '';
                        return `${it.menuItem.name}${sizeSuffix} (×${it.quantity})`;
                      }).join(' , ')}
                    </span>
                  </div>

                  {/* Address and price footer row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400 font-bold">
                    <p className="flex items-center gap-1 max-w-xs truncate">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{order.deliveryAddress}</span>
                    </p>
                    <span className="text-slate-300">|</span>
                    <p className="text-[#f94c10] font-black text-xs">
                      {t('المجموع الكلي:', 'Total due:')} {order.total.toFixed(0)} {t('جنيه', 'EGP')}
                    </p>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-r border-slate-100 md:pr-4 md:dir-rtl shrink-0">
                  
                  {/* Status Badge */}
                  <div className="shrink-0">{getStatusBadge(order.status)}</div>

                  {/* Action buttons */}
                  <div className="flex gap-2 shrink-0">
                    {/* If Delivered AND not reviewed yet, we can trigger review popup by opening tracker */}
                    {order.status === 'Delivered' && !hasBeenReviewed ? (
                      <button
                        onClick={() => onOrderClick(order)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                      >
                        <Star className="h-3.5 w-3.5 fill-current text-white animate-pulse" />
                        <span>{t('تقييم الأكل ⭐️', 'Rate Order ⭐️')}</span>
                      </button>
                    ) : order.status === 'Delivered' ? (
                      <span className="bg-slate-100 text-slate-400 text-[10px] font-black px-2.5 py-1.5 rounded-xl border border-slate-205 flex items-center gap-1 select-none">
                        <span>⭐</span>
                        <span>{t('تم التقييم', 'Reviewed')}</span>
                      </span>
                    ) : null}

                    {/* Always allow opening full tracker to view coordinates, progress status */}
                    <button
                      onClick={() => onOrderClick(order)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] py-2 px-3.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <span>🛵</span>
                      <span>{order.status === 'Delivered' ? t('تفاصيل التتبع', 'Track Details') : t('تتبع الآن 🛵', 'Track Live 🛵')}</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
