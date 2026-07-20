import React from 'react';
import { Star, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-react';
import { MenuItem, Restaurant, Review } from '../types';
import { lang } from '../translations';

interface BestSellersAndReviewsProps {
  bestSellers: { item: MenuItem; count?: number; restaurant: Restaurant }[];
  reviews: Review[];
  onAddToCart: (item: MenuItem, restaurant: Restaurant) => void;
  onOpenRestaurant: (restaurant: Restaurant) => void;}

export default function BestSellersAndReviews({

  bestSellers,
  reviews,
  onAddToCart,
  onOpenRestaurant,
}: BestSellersAndReviewsProps) {
  const isAr = true;

  const t = (arText: string, enText: string) => (isAr ? arText : enText);

  // Render stars for rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-12 my-10 max-w-7xl mx-auto px-4 md:px-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Best Sellers Area */}
      {bestSellers && bestSellers.length > 0 && (
        <section className="space-y-6">
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-orange-100 pb-4`}>
            <div className="space-y-1 text-right">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 font-display flex items-center gap-2">
                <span>🔥</span>
                <span>{t('الطلبات الأكثر مبيعاً دمار', 'Trending Best Sellers')}</span>
              </h2>
              <p className="text-xs text-slate-450 font-bold">
                {t(
                  'الأطباق الأكثر طلباً وتقييماً من عملائنا لليوم - جربها وادعيلي!',
                  'The most ordered and highly loved dishes by our clients today.'
                )}
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full shrink-0">
              {t('🔥 حد أقصى 4 أصناف بقوة الطلب', 'Top 4 Items Max')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.slice(0, 4).map(({ item, restaurant }) => {
              return (
                <div
                  key={`best-${restaurant.id}-${item.id}`}
                  className="group bg-white border border-slate-100 hover:border-orange-200 rounded-[28px] p-4 transition-all duration-300 hover:shadow-xl flex flex-col justify-between relative"
                >
                  <div className="space-y-3">
                    {/* Image */}
                    <div className="aspect-[4/3] w-full rounded-2xl bg-slate-50 overflow-hidden relative border border-slate-100/50">
                      <img
                        src={item.image || restaurant.coverImage || "/logo.png"}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-[#f94c10] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        {t('الأكثر مبيعاً 🏷️', 'Best Seller 🏷️')}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-orange-550 transition-colors">
                          {item.name}
                        </h3>
                        <span className="text-xs font-black text-[#f94c10] shrink-0">
                          {item.price} {t('جنيه', 'EGP')}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-semibold">
                          {item.description}
                        </p>
                      )}

                      {/* Origin Restaurant button */}
                      <button
                        type="button"
                        onClick={() => onOpenRestaurant(restaurant)}
                        className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-[#f94c10] font-extrabold cursor-pointer transition-colors bg-slate-50 hover:bg-orange-50/50 py-1.5 px-3 rounded-xl w-full"
                      >
                        <span>🏬</span>
                        <span className="truncate">
                          {t(`من مطعم: ${restaurant.name}`, `Store: ${restaurant.name}`)}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddToCart(item, restaurant)}
                    className="w-full bg-[#f94c10] hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl mt-4 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>{t('اضف للسلة بقوة 🛒', 'Add to Basket 🛒')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Customer Reviews Section */}
      <section className="space-y-6 pt-4 border-t border-slate-100">
        <div className="space-y-1 text-right">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 font-display flex items-center gap-2">
            <span>🗣️</span>
            <span>{t('آراء وتقييمات العملاء بكل أمانة', 'Client Reviews & Opinions')}</span>
          </h2>
          <p className="text-xs text-slate-450 font-semibold">
            {t(
              'كل كلمة بيكتبها عملائنا تظهر هنا فوراً بكل شفافية لمساعدتك في اتخاذ قرار أكلتك.',
              'Real unedited feedback shared directly by our foodie customers to help you choose.'
            )}
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6">
            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-450 font-bold">
              {t(
                'لا توجد تعليقات حتى الآن. كن أول من يطلب ويقيم الوجبة بعد التوصيل!',
                'No reviews available yet. Be the first to rate your order after delivery!'
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((rev) => {
              // Calculate average overall stars
              const avgStar = ((rev.ratingFoodQuality || 5) + (rev.ratingDeliverySpeed || 5) + (rev.ratingDeliveryManner || 5)) / 3;
              return (
                <div
                  key={rev.id}
                  className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="text-base">👤</span>
                        <span>{rev.customerName || t('عميل مسافر مجهول', 'Anonymous Customer')}</span>
                      </h4>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5" style={{ direction: 'ltr' }}>
                        {new Date(rev.createdAt).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="bg-amber-50 text-amber-600 px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="text-[10px] font-black">{avgStar.toFixed(1)}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 font-semibold leading-relaxed relative min-h-[50px] italic">
                    <span className="text-slate-300 absolute top-1 right-2 text-2xl font-serif">“</span>
                    <p className="relative z-10 px-2">
                      {rev.comment || t('الخدمة والأكل في منتهى الجمال والدقة، شكراً لكم!', 'Everything was delicious and perfectly paced!')}
                    </p>
                  </div>

                  {/* Rating Breakdown Badges */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                    <div className="text-center bg-orange-50/50 p-1.5 rounded-lg">
                      <p className="text-[8px] font-bold text-slate-400 mb-0.5">{t('جودة الأكل', 'Food Quality')}</p>
                      {renderStars(rev.ratingFoodQuality)}
                    </div>
                    <div className="text-center bg-blue-50/50 p-1.5 rounded-lg">
                      <p className="text-[8px] font-bold text-slate-400 mb-0.5">{t('سرعة المندوب', 'Delivery Speed')}</p>
                      {renderStars(rev.ratingDeliverySpeed)}
                    </div>
                    <div className="text-center bg-green-50/50 p-1.5 rounded-lg">
                      <p className="text-[8px] font-bold text-slate-400 mb-0.5">{t('أسلوب الكابتن', 'Courier Attitude')}</p>
                      {renderStars(rev.ratingDeliveryManner)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
