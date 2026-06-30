import React from 'react';
import { Star, Truck, ShieldCheck, Flame } from 'lucide-react';
import { Restaurant, Review } from '../types';
import { lang, getTranslation } from '../translations';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
  reviews?: Review[];
  key?: React.Key;
}

const LOCAL_STORE = {
  ar: {
    'Big Bun Burger Bar': 'برجر بار بيج بن 🍔',
    'Green Leaf Salads': 'سلطة الورقة الخضرا 🥗',
    'Sakura Sushi House': 'بيت سوشي ساكورا 🍣',
    'Dragon Ramen Lounge': 'لاونج تنين الرامين 🍜',
    'Sweet Delight Desserts': 'حلويات البهجة والسرور 🍦',
  } as Record<string, string>,
  en: {} as Record<string, string>
};

export function isRestaurantOpen(openTime?: string, closeTime?: string): boolean {
  if (!openTime || !closeTime) return true; // Default to open if not specified
  
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const curMinutes = currentHour * 60 + currentMinute;
    
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    
    if (closeMinutes >= openMinutes) {
      // Normal operating hours (e.g. 09:00 to 23:00)
      return curMinutes >= openMinutes && curMinutes <= closeMinutes;
    } else {
      // Over-midnight operating hours (e.g. 17:00 to 02:00)
      return curMinutes >= openMinutes || curMinutes <= closeMinutes;
    }
  } catch (e) {
    console.error("Error evaluating opening hours", e);
    return true;
  }
}

export default function RestaurantCard({
 restaurant, onClick, reviews }: RestaurantCardProps) {
  const isAr = lang === 'ar';

  const t = (key: any, params?: any) => getTranslation(key, lang as any, params);

  const displayName = (LOCAL_STORE[lang] as any)?.[restaurant.name] || restaurant.name;
  
  const isOpen = isRestaurantOpen(restaurant.openTime, restaurant.closeTime);

  // Dynamic average rating
  const dynamicRating = React.useMemo(() => {
    if (!reviews || reviews.length === 0) return restaurant.rating;
    const restReviews = reviews.filter((r) => r.restaurantId === restaurant.id);
    if (restReviews.length === 0) return restaurant.rating;
    const sum = restReviews.reduce((acc, r) => acc + (r.ratingFoodQuality || 5), 0);
    return Number((sum / restReviews.length).toFixed(1));
  }, [reviews, restaurant.id, restaurant.rating]);

  // Localize categories list
  const getLocalizedCategories = () => {
    const cats = restaurant.categories || [];
    return cats.map((c) => {
      if (c === 'burgers') return 'برجر';
      if (c === 'pizza') return 'بيتزا';
      if (c === 'salads') return 'سلطات';
      if (c === 'sushi') return 'سوشي';
      if (c === 'ramen') return 'رامين';
      if (c === 'dessert') return 'حلويات';
      return c;
    }).join(' • ');
  };

  return (
    <div 
      onClick={isOpen ? onClick : undefined}
      className={`bg-white rounded-3xl overflow-hidden border border-slate-100 transition-all duration-300 flex flex-col h-full ${
        isOpen 
          ? "hover:border-slate-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer group" 
          : "opacity-75 cursor-not-allowed"
      }`}
      dir={'rtl'}
    >
      {/* Cover Image Wrapper */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
        <img 
          referrerPolicy="no-referrer"
          src={restaurant.coverImage} 
          alt={displayName}
          className={`w-full h-full object-cover transition-transform duration-500 ${isOpen ? "group-hover:scale-104" : ""}`}
          loading="lazy"
        />

        {/* Closed Overlay */}
        {!isOpen && (
          <div className="absolute inset-0 bg-slate-900/75 flex flex-col items-center justify-center text-center p-3 z-20">
            <span className="text-xl">🔒</span>
            <span className="text-white font-black text-xs mt-1 bg-red-650 px-3 py-1 rounded-full shadow-xs">
              {'مغلق حالياً 🚪'}
            </span>
            <span className="text-slate-300 text-[10px] font-bold mt-1.5 bg-slate-800/80 px-2 py-0.5 rounded-md leading-normal">
              {`مواعيد العمل: من ${restaurant.openTime} إلى ${restaurant.closeTime}`}
            </span>
          </div>
        )}

        {/* Dynamic Badge Overlays */}
        {restaurant.promo && (
          <div className={`absolute top-4 ${'right-4'} z-10 shrink-0`}>
            {restaurant.promo === 'FREE DELIVERY' ? (
              <span className="inline-flex items-center gap-1.5 bg-white text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xs uppercase tracking-wide">
                <Truck className="h-3.5 w-3.5 text-green-500" />
                {t('freeDelivery')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-red-650 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xs uppercase tracking-wide animate-pulse">
                <Flame className="h-3.5 w-3.5 fill-current text-yellow-300" />
                {t('offersBadge')}
              </span>
            )}
          </div>
        )}

        {/* Soft tag for ETA / distance */}
        <div className={`absolute bottom-4 ${'right-4'} bg-slate-900/50 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg`}>
          {restaurant.distance} {t('km')} • {restaurant.deliveryTime}
        </div>
      </div>

      {/* Information Row */}
      <div className="p-4 flex flex-col justify-between flex-grow">
        <div className="flex items-center justify-between gap-2">
          {/* Restaurant Title */}
          <h3 className="font-display font-black text-slate-800 text-sm sm:text-base group-hover:text-[#f94c10] transition-colors line-clamp-1">
            {displayName}
          </h3>

          {/* Green Star Rating badge */}
          <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 border border-green-100">
            <span>{dynamicRating}</span>
            <Star className="h-3 w-3 fill-current text-green-600" />
          </div>
        </div>

        {/* Subtitles */}
        <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400 font-bold font-sans">
          <div className="flex items-center gap-1.5">
            <span className="capitalize">{getLocalizedCategories()}</span>
          </div>

          <div>
            {restaurant.deliveryFee === 0 ? (
              <span className="text-green-600 font-bold uppercase">{t('freeDelivery')}</span>
            ) : (
              <span>{t('deliveryFee')}: {restaurant.deliveryFee.toFixed(0)} {t('egp')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
