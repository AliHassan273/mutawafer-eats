import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ShoppingBag, ChevronDown, User, ShieldCheck, Clock, Globe, Menu } from 'lucide-react';
import { Order } from '../types';
import { Language, getTranslation } from '../translations';
import Logo from './Logo';

interface HeaderProps {
  currentAddress: string;
  setAddress: (address: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cartCount: number;
  onCartClick: () => void;
  activeOrders: Order[];
  onOrderClick: (order: Order) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  activeView: 'home' | 'restaurant' | 'tracker' | 'admin' | 'captain' | 'about' | 'my-orders';
  setActiveView: (view: 'home' | 'restaurant' | 'tracker' | 'admin' | 'captain' | 'about' | 'my-orders') => void;
  currentUser: { id: string; name: string; email: string; phone: string; role?: string } | null;
  onAuthClick: () => void;
  onLogout: () => void;
}

const ADDRESSES_MAP = {
  en: [
    'Building 44, Downtown District',
    'Al-Manara Tower, Marina Gate 2',
    'Plot 92, Zamalek Nile View',
    'Villa 108, El-Rehab City Sector C'
  ],
  ar: [
    'عمارة ٤٤، وسط البلد - القاهرة',
    'برج المنارة، المرسى بوابة ٢',
    'قطعة ٩٢، إطلالة النيل بالزمالك',
    'فيلا ١٠٨، مدينة الرحاب قطاع ج'
  ]
};

export default function Header({
  currentAddress,
  setAddress,
  searchQuery,
  setSearchQuery,
  cartCount,
  onCartClick,
  activeOrders,
  onOrderClick,
  lang,
  setLang,
  activeView,
  setActiveView,
  currentUser,
  onAuthClick,
  onLogout,
}: HeaderProps) {
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showMenuList, setShowMenuList] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const t = (key: any, params?: any) => getTranslation(key, lang, params);

  const addressList = ADDRESSES_MAP[lang] || ADDRESSES_MAP['en'];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs px-3 py-2.5 sm:px-6 sm:py-3.5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Row 1: Logo and Location Picker Pill */}
        <div className="flex items-center justify-between md:justify-start gap-3 sm:gap-6 shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-1 cursor-pointer select-none active:scale-95 transition-transform" onClick={() => { setActiveView('home'); setSearchQuery(''); }}>
            <Logo size="sm" lang={lang} />
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-0.5">
                <span className="font-display font-black text-base sm:text-lg tracking-tight text-amber-500">{lang === 'ar' ? 'متوفر' : 'MUTAFER'}</span>
                <span className="font-display font-black text-base sm:text-lg tracking-tight text-slate-800">{lang === 'ar' ? 'إيتس' : 'EATS'}</span>
              </div>
              <span className="text-[7.5px] sm:text-[9px] font-black text-sky-500 uppercase tracking-widest mt-0.5" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
                {lang === 'ar' ? 'الغالي للغوالي ✨' : 'Gourmet Delivery ✨'}
              </span>
            </div>
          </div>

          {/* Location Picker Pill - Removed as requested */}
        </div>

        {/* Row 2: Search Input and "القائمة" Menu (Side-by-side on mobile, grouped on desktop) */}
        <div className="flex items-center gap-2 w-full md:w-auto md:max-w-md lg:max-w-xl flex-1 justify-end">
          
          {/* Top-Level High-Contrast Search Bar */}
          <div className="relative flex-1 min-w-0 md:max-w-[260px] lg:max-w-[340px]">
            <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 pointer-events-none`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeView !== 'home' && activeView !== 'admin') {
                  setActiveView('home');
                }
              }}
              placeholder={lang === 'ar' ? 'دور على أكلك المفضل...' : 'Hungry? Search your food...'}
              className={`w-full bg-slate-50 focus:bg-white hover:bg-slate-100/50 border border-slate-200 focus:border-amber-500/45 focus:ring-4 focus:ring-amber-500/6 rounded-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none transition-all ${
                lang === 'ar' ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'
              } py-1.5 sm:py-2`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className={`absolute ${lang === 'ar' ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-205 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer`}
              >
                ×
              </button>
            )}
          </div>

          {/* "القائمة" (Menu Button) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenuList(!showMenuList)}
              className="flex items-center gap-1.5 bg-amber-500 text-white hover:bg-amber-600 py-1.5 px-3.5 sm:py-2 sm:px-5 rounded-full text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer hover:scale-102 active:scale-98"
            >
              <Menu className="h-4 w-4 shrink-0" />
              <span className="font-bold sm:font-black">{lang === 'ar' ? 'القائمة' : 'Menu'}</span>
              {cartCount > 0 && (
                <span className="bg-white text-amber-500 text-[9px] sm:text-[10px] font-black h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full flex items-center justify-center animate-pulse shrink-0">
                  {cartCount}
                </span>
              )}
            </button>

            {showMenuList && (
              <div 
                className={`absolute ${
                  lang === 'ar' ? 'left-0' : 'right-0'
                } mt-2.5 z-50 bg-white border border-slate-150 rounded-2xl shadow-2xl w-[280px] sm:w-80 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-120`}
                style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
              >
                  
                  {/* Title Header */}
                  <div className={`flex items-center justify-between border-b border-slate-100 pb-2 ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      {lang === 'ar' ? 'خيارات التحكم والطلبات' : 'Settings & Active Orders'}
                    </span>
                    <button 
                      onClick={() => setShowMenuList(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs sm:text-[11px] font-bold cursor-pointer"
                    >
                      {lang === 'ar' ? 'إغلاق ×' : 'Close ×'}
                    </button>
                  </div>

                  {/* Cart Option inside the layout */}
                  <button
                    onClick={() => {
                      onCartClick();
                      setShowMenuList(false);
                    }}
                    className={`w-full bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer text-slate-700 hover:text-[#f94c10] ${
                      lang === 'ar' ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-[#f94c10]" />
                      <span className="text-xs font-bold">{lang === 'ar' ? 'السلة و المشتريات' : 'My Shopping Basket'}</span>
                    </div>
                    <span className="bg-[#f94c10] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {lang === 'ar' ? `${cartCount} أصناف` : `${cartCount} Items`}
                    </span>
                  </button>

                  {/* Admin Panel Option */}
                  <button
                    onClick={() => {
                      setActiveView(activeView === 'admin' ? 'home' : 'admin');
                      setShowMenuList(false);
                    }}
                    className={`w-full border rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                      activeView === 'admin'
                        ? 'bg-amber-100 border-amber-300 text-amber-900 font-extrabold'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-705'
                    } ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-bold">{lang === 'ar' ? 'لوحة تحكم الإدارة (تعديل المطاعم)' : 'App Admin Portal (Manage)'}</span>
                    </div>
                    <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                      {lang === 'ar' ? '🛠️ أدمن' : '🛠️ Admin'}
                    </span>
                  </button>

                  {/* Captain Portal Option */}
                  <button
                    onClick={() => {
                      setActiveView(activeView === 'captain' ? 'home' : 'captain');
                      setShowMenuList(false);
                    }}
                    className={`w-full border rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                      activeView === 'captain'
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-950 font-extrabold'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-705'
                    } ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🛵</span>
                      <span className="text-xs font-bold">{lang === 'ar' ? 'بوابة الكابتن وتوصيل الطلبات' : 'Delivery Captain Workspace'}</span>
                    </div>
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black">
                      {lang === 'ar' ? 'كابتن 🛵' : 'Captain'}
                    </span>
                  </button>

                  {/* My Orders Option */}
                  <button
                    onClick={() => {
                      setActiveView('my-orders');
                      setShowMenuList(false);
                    }}
                    className={`w-full border rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                      activeView === 'my-orders'
                        ? 'bg-amber-100 border-amber-300 text-amber-950 font-extrabold'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-750'
                    } ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📋</span>
                      <span className="text-xs font-bold">{lang === 'ar' ? 'سجل طلباتي ومتابعة الدليفري' : 'My Orders & Delivery Tracking'}</span>
                    </div>
                    <span className="text-[10px] bg-amber-550 text-white px-2 py-0.5 rounded-full font-black">
                      {lang === 'ar' ? 'طلباتي 📋' : 'Orders'}
                    </span>
                  </button>

                  {/* About Us Page Option */}
                  <button
                    onClick={() => {
                      setActiveView('about');
                      setShowMenuList(false);
                    }}
                    className={`w-full border rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                      activeView === 'about'
                        ? 'bg-orange-50 border-orange-200 text-orange-950 font-extrabold'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-705'
                    } ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">ℹ️</span>
                      <span className="text-xs font-bold">{lang === 'ar' ? 'من نحن (معلومات عن التطبيق)' : 'About Us (Our Story)'}</span>
                    </div>
                    <span className="text-[10px] bg-[#f94c10] text-white px-2 py-0.5 rounded-full font-black">
                      {lang === 'ar' ? 'قصتنا ✨' : 'About'}
                    </span>
                  </button>

                  {/* Active Orders Panel view */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 block pb-0.5 uppercase tracking-wide">
                      {lang === 'ar' ? 'تتبع طلباتك النشطة' : 'Live Order Tracking'}
                    </span>
                    {activeOrders.length === 0 ? (
                      <div className="text-center py-1.5 text-slate-400 text-[11px]">
                        {lang === 'ar' ? 'لا توجـد طلبات نشطة حاليًا.' : 'No active orders right now.'}
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                        {activeOrders.map((order) => (
                          <button
                            key={order.id}
                            onClick={() => {
                              onOrderClick(order);
                              setShowMenuList(false);
                            }}
                            className={`w-full text-right p-2 hover:bg-orange-50/60 rounded-xl transition-all flex items-start gap-2 border border-slate-50 cursor-pointer ${
                              lang === 'ar' ? '' : 'text-left'
                            }`}
                          >
                            <div className="bg-orange-50 p-1.5 rounded-lg text-[#f94c10] mt-0.5 shrink-0">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {order.restaurant.name}
                              </p>
                              <div className={`flex items-center gap-1 mt-0.5 ${lang === 'ar' ? '' : 'justify-start'}`}>
                                <span className="inline-block h-1.5 w-1.5 bg-green-550 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black text-slate-550">
                                  {order.status === 'Pending' && (lang === 'ar' ? 'بانتظار موافقة الإدارة ⏳' : 'Pending Approval ⏳')}
                                  {order.status === 'Received' && (lang === 'ar' ? 'استلمنا طلبك 👍' : 'Order Received 👍')}
                                  {order.status === 'Preparing' && (lang === 'ar' ? 'بيحضروا الأكل بكل حب 👨‍🍳' : 'Preparing food with love 👨‍🍳')}
                                  {order.status === 'OutForDelivery' && (lang === 'ar' ? 'الطيار طار وجايلك 🛵' : 'Courier Out For Delivery 🛵')}
                                  {order.status === 'Delivered' && (lang === 'ar' ? 'ألف هنا وشفا! 🥰' : 'Enjoy your meal! 🥰')}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-450 mt-0.5">
                                {lang === 'ar' 
                                  ? `الحساب: ${order.total.toFixed(0)} جنيه • ${order.items.length} أصناف`
                                  : `Total: ${order.total.toFixed(0)} GP • ${order.items.length} dishes`}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Logged-In User Profile Details Row */}
                  {currentUser ? (
                    <div className={`bg-slate-50/85 rounded-xl p-2 flex flex-col gap-2 border border-slate-100`}>
                      <div className={`flex items-center gap-2.5 ${lang === 'ar' ? '' : 'flex-row-reverse'}`}>
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-500 text-xs">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`min-w-0 flex-1 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                          <p className="text-[11px] font-bold text-slate-800 truncate">{currentUser.name}</p>
                          <p className="text-[9px] text-slate-400 truncate font-mono">{currentUser.phone || currentUser.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onLogout();
                          setShowMenuList(false);
                        }}
                        className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                      >
                        {lang === 'ar' ? 'تسجيل الخرج من الحساب 🚪' : 'Logout from Account 🚪'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          onAuthClick();
                          setShowMenuList(false);
                        }}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>🔑</span>
                        <span>{lang === 'ar' ? 'تسجيل الدخول / حساب جديد' : 'Log In / Register'}</span>
                      </button>
                    </div>
                  )}

                </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
