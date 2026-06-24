import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, Tag, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';
import { Language, getTranslation } from '../translations';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onAddToCart: (item: any, restaurantInstance: any, selectedSize?: any) => void;
  onRemoveFromCart: (itemId: string, selectedSizeId?: string, forceRemoveAll?: boolean) => void;
  onCheckout: (appliedPromo: string, discountValue: number) => void;
  lang: Language;
  coupons?: { id: string; code: string; discountType: 'percentage' | 'flat'; discountValue: number; minOrder: number; isActive: boolean }[];
}

const DISH_NAMES_MAP = {
  ar: {
    'The Original Big Bun': 'برجر بيج بن الأصلي 🍔',
    'Smokey Bacon & Cheese': 'برجر سموكي بيكون وجبنة 🥓',
    'Chili Lava Fire Burger': 'برجر بركان الشطة الحار 🌋',
    'Truffle Mushroom Burger': 'برجر فطر المشروم والترافل 🍄',
    'Crunchy Cheesy Sweet Potato Fries': 'بطاطس حلوة مقرمشة بالجبنة 🍟',
    'Avocado Garden Crunch': 'برجر الفراخ المقرمشة بالأفوكادو 🥑',
    'Craft Oreo Vanilla Milkshake': 'ميلك شيك أوريو وفانيليا 🥤',
    'Sourdough Margherita': 'مارجريتا العجينة الهشة 🍕',
    'Double Pepperoni Dynamite': 'ديناميت دبل بيبيروني 🍕',
    'Truffle Porcini White Pizza': 'بيتزا بيضاء بالفطر والترافل 🍕',
    'Mediterranean Feast Veggie': 'بيتزا الفيست المتوسطية الخضراء 🍕',
    'Signature Garlic Dough Knots': 'عقد عجين الثوم والزبدة المميزة 🥖',
    'Sparkling Lemon & Mint Soda': 'صودا ليمون ونعناع فوارة 🥤',
    'Avocado Buddha Glow Bowl': 'طبق الأفوكادو وجلو بودا 🥗',
    'Crispy Sesame Ginger Tofu': 'سلطة توفو مقرمشة بسمسم وزنجبيل 🥗',
    'Crispy Sesame Ginger Tofu Salad': 'سلطة توفو مقرمشة بسمسم وزنجبيل 🥗',
    'Wild Salmon Quinoa Harvest': 'سلطة السلمون البري والكينوا 🥗',
    'Warm Roasted Veggie Medley': 'خضار مشوية دافئة ومتنوعة 🥕',
    'Antioxidant Super-Berry Smoothie': 'سموثي سوبر بيري اللذيذ 🍓',
    'Dragon Roll Deluxe': 'رول تنين السوشي ديلوكس 🍣',
    'Premium Nigiri Tasting': 'وجبة تذوق نيجيري فاخرة 🍣',
    'Spicy Volcano Tuna Roll': 'رول تونة بركان سبايسي 🍣',
    'Fresh Edamame with Sea Salt': 'إدامامي طازج بملح البحر 🫛',
    'Truffle Tonkotsu Ramen': 'رامين تونكوتسو بالترافل الأسود 🍜',
    'Fiery Black Garlic Black Belt': 'رامين كرات الثوم الأسود الحار 🍜',
    'Steamed Pan-Fried Pork Gyoza': 'فطاير جيوزا مقلية ومطهية عالبخار 🥟',
    'Cold Jasmine Green Brew': 'شاي ياسمين أخضر مثلج روعة 🥤',
    'Ultimate Chocolate Molten Cup': 'كيكة شوكولاتة مولتن حكاية 🧁',
    'Strawberries & Cream Waffle Tower': 'برج وافل الفراولة والكريمة السايحة 🧇',
    'Matcha Crème Brûlée': 'ماتشا كريم بروليه الفاخرة 🍮'
  } as Record<string, string>,
  en: {} as Record<string, string>
};

export default function CartSidebar({
  isOpen,
  onClose,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onCheckout,
  lang,
  coupons,
}: CartSidebarProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccessMessage, setPromoSuccessMessage] = useState('');

  if (!isOpen) return null;

  const t = (key: any, params?: any) => getTranslation(key, lang, params);
  const isAr = lang === 'ar';

  // Compute pricing totals
  const subtotal = cart.reduce((total, item) => total + ((item.selectedSize ? item.selectedSize.price : item.menuItem.price) * item.quantity), 0);
  
  // Free delivery limit is 300 EGP as proper standard limit
  const deliveryFee = cart.length > 0 ? (subtotal > 300 ? 0 : 25) : 0; 

  const activeCoupons = coupons && coupons.length > 0 ? coupons : [
    { id: "cp_1", code: "FIRST50", discountType: "percentage" as const, discountValue: 50, minOrder: 0, isActive: true },
    { id: "cp_2", code: "EATS10", discountType: "flat" as const, discountValue: 30, minOrder: 150, isActive: true }
  ];

  const getDiscount = () => {
    if (!appliedPromo) return 0;
    const coupon = activeCoupons.find(c => c.code.toUpperCase() === appliedPromo.toUpperCase() && c.isActive);
    if (!coupon) return 0;

    if (coupon.discountType === 'percentage') {
      return subtotal * (coupon.discountValue / 100);
    } else {
      return coupon.discountValue;
    }
  };

  const discount = getDiscount();
  const finalTotal = Math.max(0, subtotal + deliveryFee - discount);

  const handleApplyPromo = () => {
    const sanitized = promoCode.trim().toUpperCase();
    if (!sanitized) return;

    const coupon = activeCoupons.find(c => c.code.toUpperCase() === sanitized);
    
    if (!coupon) {
      setPromoError(
        isAr 
          ? 'عفوًا! هذا الكود غير صالح أو منتهي الصلاحية.' 
          : 'Sorry! This coupon code is invalid or expired.'
      );
      setPromoSuccessMessage('');
      return;
    }

    if (!coupon.isActive) {
      setPromoError(
        isAr 
          ? 'عفوًا! هذا الكوبون غير مفعّل حاليًا.' 
          : 'Sorry! This coupon is currently inactive.'
      );
      setPromoSuccessMessage('');
      return;
    }

    if (subtotal < coupon.minOrder) {
      setPromoError(
        isAr 
          ? `عفوًا! يتطلب هذا الكوبون حد أدنى للطلب بقيمة ${coupon.minOrder} ج.م` 
          : `Sorry! This coupon requires a minimum subtotal of ${coupon.minOrder} EGP`
      );
      setPromoSuccessMessage('');
      return;
    }

    setAppliedPromo(coupon.code.toUpperCase());
    setPromoError('');
    
    const discountAmount = coupon.discountType === 'percentage' 
      ? `${coupon.discountValue}%` 
      : `${coupon.discountValue} ج.م`;

    setPromoSuccessMessage(
      isAr 
        ? `تم تطبيق الكود "${coupon.code}" بنجاح! حصلت على خصم بقيمة ${discountAmount}.` 
        : `Coupon "${coupon.code}" successfully applied! You saved ${discountAmount}.`
    );
  };

  const handleRemovePromo = () => {
    setAppliedPromo('');
    setPromoCode('');
    setPromoSuccessMessage('');
    setPromoError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background Dim layer */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      <div className={`fixed inset-y-0 ${isAr ? 'left-0 pl-10' : 'right-0 pr-10'} max-w-full flex`}>
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full rounded-r-3xl rounded-l-3xl overflow-hidden border-l border-slate-100">
          
          {/* Cart Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="bg-orange-50 text-[#f94c10] p-1.5 rounded-xl">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                <h2 className="text-base font-extrabold text-slate-800 font-display">
                  {isAr ? 'سلة الأكيلة 🧺' : 'Your Basket'}
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  ({cart.length} {isAr ? 'أصناف مضافة' : 'items added'})
                </p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Body Scroll list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth no-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-700">
                    {isAr ? 'سلتك لسة فاضية خالص!' : 'Your basket is empty'}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold max-w-xs mt-1.5 leading-normal">
                    {isAr 
                      ? 'الكرش بيلف ويدور! لف على المطاعم القريبة واختارلك أكلة جامدة تفرتك الجوع.' 
                      : 'Browse restaurants nearby and add delicious food items to satisfy your cravings!'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group items by restaurant to look organized */}
                {Array.from(new Set(cart.map(item => item.restaurantName))).map(restaurantName => {
                  const itemsForRestaurant = cart.filter(item => item.restaurantName === restaurantName);
                  
                  return (
                    <div key={restaurantName} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0" style={{ textAlign: isAr ? 'right' : 'left' }}>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                        {restaurantName}
                      </div>

                      <div className="space-y-3">
                        {itemsForRestaurant.map((item) => {
                          const dishName = (DISH_NAMES_MAP[lang] as any)?.[item.menuItem.name] || item.menuItem.name;
                          const currentPrice = item.selectedSize ? item.selectedSize.price : item.menuItem.price;
                          return (
                            <div 
                              key={`${item.menuItem.id}-${item.selectedSize?.id || 'default'}`} 
                              className={`flex items-center justify-between gap-4 p-2 hover:bg-slate-50 rounded-2xl transition-all ${isAr ? 'flex-row-reverse' : ''}`}
                            >
                              {/* Food small representation */}
                              <div className="flex items-center gap-3">
                                <img 
                                  referrerPolicy="no-referrer"
                                  src={item.menuItem.image} 
                                  alt={dishName} 
                                  className="h-11 w-11 object-cover rounded-xl bg-slate-50 border border-slate-100"
                                />
                                <div className="min-w-0" style={{ textAlign: isAr ? 'right' : 'left' }}>
                                  <h4 className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                                    {dishName}
                                  </h4>
                                   {item.selectedSize && (
                                    <span className="inline-block text-[9px] font-black bg-orange-50 text-[#f94c10] px-1.5 py-0.5 rounded-md mt-0.5 border border-orange-100">
                                      {item.selectedSize.name}
                                    </span>
                                  )}
                                  <p className="text-[11px] text-slate-400 font-bold font-mono mt-0.5">
                                    {currentPrice.toFixed(0)} {t('egp')}
                                  </p>
                                </div>
                              </div>

                              {/* Row controls */}
                              <div className="flex items-center gap-3" style={{ direction: 'ltr' }}>
                                <div className="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-150">
                                  <button
                                    onClick={() => onRemoveFromCart(item.menuItem.id, item.selectedSize?.id)}
                                    className="h-5 w-5 rounded-full bg-white text-slate-600 flex items-center justify-center text-xs hover:bg-slate-50 cursor-pointer font-bold border border-slate-100"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-5 text-center text-xs font-bold text-slate-700">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => onAddToCart(item.menuItem, { id: item.restaurantId, name: item.restaurantName }, item.selectedSize)}
                                    className="h-5 w-5 rounded-full bg-white text-slate-600 flex items-center justify-center text-xs hover:bg-slate-50 cursor-pointer font-bold border border-slate-100"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>

                                <button
                                 onClick={() => onRemoveFromCart(item.menuItem.id, item.selectedSize?.id, true)}
                                  className="text-slate-350 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Pricing Breakdown and Promo codes */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4 shrink-0" style={{ textAlign: isAr ? 'right' : 'left' }}>
              {/* Promo code area */}
              <div className="space-y-1.5">
                <div className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                  <div className="relative flex-1">
                    <Tag className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400`} />
                    <input
                      type="text"
                      placeholder={isAr ? 'اكتب كود الخصم هنا' : 'ENTER PROMO CODE'}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={!!appliedPromo}
                      className={`w-full bg-white border border-slate-200 focus:border-slate-300 rounded-xl py-1.5 text-xs outline-none uppercase font-mono tracking-wider transition-all disabled:bg-slate-100 disabled:text-slate-400 ${
                        isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>
                  {appliedPromo ? (
                    <button
                      onClick={handleRemovePromo}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-red-100"
                    >
                      {isAr ? 'مسح' : 'Remove'}
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyPromo}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {isAr ? 'تطبيق' : 'Apply'}
                    </button>
                  )}
                </div>

                {/* Voucher message displayer */}
                {promoError && (
                  <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1 justify-start">
                    <AlertCircle className="h-3 w-3 shrink-0" /> <span>{promoError}</span>
                  </p>
                )}
                {promoSuccessMessage && (
                  <p className="text-[10px] text-green-600 font-semibold flex items-center gap-1 justify-start">
                    <Check className="h-3.5 w-3.5 shrink-0" /> <span>{promoSuccessMessage}</span>
                  </p>
                )}

                {/* Suggest code buttons removed to avoid proposing them on order page as per request */}
              </div>

              {/* Price break-down list */}
              <div className="space-y-2 border-t border-b border-slate-100/80 py-3 text-xs">
                <div className="flex justify-between font-medium text-slate-500">
                  <span>{isAr ? 'تمن الأكل' : 'Subtotal'}</span>
                  <span>{subtotal.toFixed(0)} {t('egp')}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between font-bold text-green-600">
                    <span>{isAr ? `خصم الكوبون (${appliedPromo})` : `Discount Coupon (${appliedPromo})`}</span>
                    <span>-{discount.toFixed(0)} {t('egp')}</span>
                  </div>
                )}

                <div className="flex justify-between font-medium text-slate-500">
                  <span>{isAr ? 'حساب الدليفري' : 'Delivery Fee'}</span>
                  <span>{deliveryFee === 0 ? (isAr ? 'مجاني يا بطل' : 'FREE') : `${deliveryFee.toFixed(0)} ${t('egp')}`}</span>
                </div>

                {subtotal < 300 && (
                  <p className="text-[9px] text-orange-500 font-semibold !mt-0.5 text-right">
                    {isAr 
                      ? `اطلب بـ ${(300 - subtotal).toFixed(0)} ج.م كمان عشان تاخد دليفري ببلاش!` 
                      : `Spend ${(300 - subtotal).toFixed(0)} EGP more for FREE DELIVERY`}
                  </p>
                )}

                <div className="flex justify-between font-extrabold text-[#0f172a] text-sm sm:text-base pt-1">
                  <span>{isAr ? 'الحساب كلو' : 'Total Amount'}</span>
                  <span className="font-display">{finalTotal.toFixed(0)} {t('egp')}</span>
                </div>
              </div>

              {/* Checkout triggers */}
              <button
                onClick={() => onCheckout(appliedPromo, discount)}
                className="w-full bg-[#f94c10] hover:bg-[#e03d08] text-white py-3 rounded-2xl font-bold font-display text-sm flex items-center justify-center gap-2 hover:scale-102 transition-all cursor-pointer shadow-md"
              >
                {t('checkout')}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
