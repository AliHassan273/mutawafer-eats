import React, { useState } from 'react';
import { ArrowLeft, Star, Clock, Truck, Plus, Minus, Search, Edit, Trash2, Sparkles } from 'lucide-react';
import { Restaurant, MenuItem, CartItem, Review } from '../types';
import { isRestaurantOpen } from './RestaurantCard';
import { lang } from '../translations';
import { deleteMenuItemFromSupabase } from '../services/supabaseMenuService';
import MenuItemEditor from './admin/MenuItemEditor';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
  cart: CartItem[];
  onAddToCart: (item: MenuItem, restaurantInstance: Restaurant, selectedSize?: any) => void;
  onRemoveFromCart: (itemId: string, selectedSizeId?: string, forceRemoveAll?: boolean) => void;
  onRefreshData?: () => Promise<void>;
  reviews?: Review[];
  categoriesList?: { id: string; name: string; nameAr: string; icon: string }[];
  hiddenCategories?: string[];
}

const LOCAL_DISH_STORE = {
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

const CATEGORIES_LABELS_MAP = {
  en: {
    All: 'All Options',
    Popular: 'Popular',
    Burgers: 'Burgers',
    Pizza: 'Pizza',
    Salads: 'Salads',
    Sushi: 'Sushi',
    Ramen: 'Ramen',
    Dessert: 'Desserts',
    Sides: 'Sides',
    Drinks: 'Drinks',
    Offers: 'Special Offers'
  },
  ar: {
    All: 'كل القائمة 🍽️',
    Popular: 'الأكثر طلباً 🔥',
    Burgers: 'برجر 🍔',
    Pizza: 'بيتزا 🍕',
    Salads: 'سلطات 🥗',
    Sushi: 'سوشي 🍣',
    Ramen: 'رامين 🍜',
    Dessert: 'حلويات 🍰',
    Sides: 'المقبلات والجانبية 🍟',
    Drinks: 'مشروبات فريش 🥤',
    Offers: 'عروض خاصة 🏷️'
  }
};

export default function RestaurantDetail({
  restaurant,
  onBack,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onRefreshData,
  reviews,
  categoriesList = [],
  hiddenCategories = [],
}: RestaurantDetailProps) {
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [itemSearch, setItemSearch] = useState('');


  const isAr = true;
  const t = (key: string) => ({ egp: 'ج', add: 'أضف', remove: 'احذف', noItems: 'لا توجد أصناف' } as any)[key] ?? key;

  const isOpen = isRestaurantOpen(restaurant.openTime, restaurant.closeTime);

  // متوسط التقييم الحقيقي — محسوب من تقييمات العملاء الفعلية فقط، بدون أي رقم افتراضي
  const dynamicRating = React.useMemo(() => {
    const restReviews = (reviews || []).filter((r) => r.restaurantId === restaurant.id);
    if (restReviews.length === 0) return null;
    const sum = restReviews.reduce((acc, r) => acc + (r.ratingFoodQuality || 0), 0);
    return Number((sum / restReviews.length).toFixed(1));
  }, [reviews, restaurant.id]);

  const handleAddToCartSecure = (item: MenuItem, rest: Restaurant, selectedSize?: any) => {
    if (!isOpen) {
      alert("عذراً، هذا المطعم مغلق حالياً وبرا أوقات العمل الرسمية المحددة.");
      return;
    }
    onAddToCart(item, rest, selectedSize);
  };

  // Admin detection state
  const [currentAdmin] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("mutafer_logged_in_admin");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const canModifyMenu = currentAdmin && (currentAdmin.role === 'primary' || currentAdmin.canManageMenu === true);

  // نافذة إضافة/تعديل الصنف — نفس الكومبوننت المشترك المستخدم أيضًا في لوحة تحكم الأدمن
  const [editingDishItem, setEditingDishItem] = useState<MenuItem | null>(null);
  const [isAddingNewDish, setIsAddingNewDish] = useState(false);
  const [deleteConfirmDishId, setDeleteConfirmDishId] = useState<string | null>(null);

  // Toast notifications state
  const [successToast, setSuccessToast] = useState("");

  const handleOpenAddDish = () => {
    setEditingDishItem(null);
    setIsAddingNewDish(true);
  };

  const handleOpenEditDish = (item: MenuItem) => {
    setIsAddingNewDish(false);
    setEditingDishItem(item);
  };

  const handleDeleteDishConfirm = async (itemId: string) => {
    if (!canModifyMenu) return;

    try {
      await deleteMenuItemFromSupabase(itemId);
      if (onRefreshData) await onRefreshData();
      setDeleteConfirmDishId(null);
      setSuccessToast('تم حذف الصنف بنجاح.');
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Extract unique subcategories from the restaurant's menu
  const hidden = new Set(hiddenCategories.map(value => String(value).trim().toLowerCase()));
  const menuCategories = ['All', ...Array.from(new Set(restaurant.menu.filter(item => !hidden.has(String(item.category || '').trim().toLowerCase())).map(item => item.category)))];

  // Filter menu items by selected sub-category and search criteria
  const filteredMenu = restaurant.menu.filter((item) => {
    if (hidden.has(String(item.category || '').trim().toLowerCase())) return false;
    // Correct matchesCategory to check if 'All' or matches specific item category
    const matchesCategory = selectedSubCategory === 'All' || item.category === selectedSubCategory;
    const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          item.description.toLowerCase().includes(itemSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get current state of an item in the shopping cart
  const getSizeKey = (sz?: any) => sz ? (sz.id || sz.name) : null;

  const cartItemOf = (itemId: string, sizeId?: string) => {
    return cart.find(c =>
      c.menuItem.id === itemId &&
      getSizeKey(c.selectedSize) === (sizeId || null)
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6" dir={'rtl'}>
      
      {/* Back navigation button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-[#f94c10] text-xs sm:text-sm font-semibold mb-6 group cursor-pointer transition-colors"
      >
        <ArrowLeft className={`h-4 w-4 transition-transform ${'rotate-180 group-hover:translate-x-1'}`} />
        <span>{t('backToHome')}</span>
      </button>

      {canModifyMenu && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl mb-6 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 bg-amber-100 rounded-lg text-amber-800 text-xs font-bold">🛠️ {"تحرير القائمة"}</span>
            <p className="text-xs font-bold text-slate-700 text-right sm:text-left">
              {`مرحباً يا معلم ${currentAdmin.name}! يمكنك تعديل الأصناف أو إضافة وجبات جديدة لهذا المطعم فورياً.`}
            </p>
          </div>
          <button
            onClick={handleOpenAddDish}
            className="bg-[#f94c10] hover:bg-orange-600 text-white font-black text-xs px-4 py-2 rounded-full cursor-pointer transition-all shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>{"إضافة صنف جديد بالمنيو"}</span>
          </button>
        </div>
      )}

      {successToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-slate-700/50 text-white text-xs font-semibold py-3 px-6 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Closed Notice Banner */}
      {!isOpen && (
        <div className="bg-red-550/10 border-2 border-red-550/30 text-red-750 bg-red-50 border-red-200 text-red-800 rounded-3xl p-5 mb-8 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="text-2xl pt-1">🔒</span>
          <div>
            <h4 className="text-sm font-black text-slate-800">{"عذراً، هذا المطعم مغلق حالياً ولا يستقبل طلبات جديدة! 🚫"}</h4>
            <p className="text-xs font-bold text-slate-500 mt-1 leading-normal">
              {`المطعم خارج أوقات العمل الرسمية التي حددها الأدمن. نتشرف بخدمتكم اليوم خلال مواعيد العمل الرسمية: من ${restaurant.openTime} إلى ${restaurant.closeTime}.`}
            </p>
          </div>
        </div>
      )}

      {/* Restaurant Info Header Card */}
      <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xs mb-8">
        <div className="relative h-48 sm:h-64 md:h-80 w-full bg-slate-100">
          <img 
            referrerPolicy="no-referrer"
            src={restaurant.coverImage} 
            alt={restaurant.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-900/10" />
          
          <div className={`absolute bottom-6 ${'right-6 text-right'} right-6 text-white`}>
            <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight">
              {restaurant.name}
            </h1>
            <p className="text-slate-200 text-xs sm:text-sm font-medium max-w-2xl mt-1.5 opacity-90 line-clamp-2">
              {restaurant.descriptionString}
            </p>
          </div>
        </div>

        {/* Info Strip */}
        <div className="p-5 flex flex-wrap items-center justify-between gap-4 bg-white">
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('rating')}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {dynamicRating !== null ? (
                  <>
                    <span className="text-sm font-extrabold text-[#0f172a] font-display">{dynamicRating}</span>
                    <Star className="h-4 w-4 fill-current text-green-500 shrink-0" />
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-400">لا يوجد تقييمات بعد</span>
                )}
              </div>
            </div>
          </div>

          {/* Micro Search within Menu */}
          <div className="relative w-full sm:w-64">
            <Search className={`absolute ${'right-3'} top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400`} />
            <input
              type="text"
              placeholder={'دور في المنيو...'}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className={`w-full bg-slate-50 border-0 text-slate-800 placeholder-slate-400 rounded-full py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-medium ${
                'pr-9 pl-3 text-right'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Menu Categories Horizontal Filter Bar */}
      <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar border-b border-slate-150 mb-6">
        {menuCategories.map((subcat) => {
          const isSelected = selectedSubCategory === subcat;
          const subCategoryLabel = (CATEGORIES_LABELS_MAP[lang] as any)?.[subcat] || subcat;

          return (
            <button
              key={subcat}
              onClick={() => setSelectedSubCategory(subcat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-150 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              {subCategoryLabel}
            </button>
          );
        })}
      </div>

      {/* Menu Items Grid */}
      {filteredMenu.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-50 p-6">
          <p className="text-slate-400 text-sm font-medium">
            {'ملقيناش أكلات مطابقة للبحث أو التثبيت.'}
          </p>
          <button 
            onClick={() => { setItemSearch(''); setSelectedSubCategory('All'); }}
            className="text-xs text-[#f94c10] font-bold mt-2 hover:underline cursor-pointer"
          >
            {'إعادة تعيين القائمة'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMenu.map((item) => {
            const added = cartItemOf(item.id);
            const dishName = (LOCAL_DISH_STORE[lang] as any)?.[item.name] || item.name;

            return (
              <div 
                key={item.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 flex gap-4 hover:shadow-xs transition-all relative overflow-hidden group"
              >
                {/* Food Item Image */}
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden bg-slate-50 shrink-0 relative">
                  <img 
                    referrerPolicy="no-referrer"
                    src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"} 
                    alt={dishName} 
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    loading="lazy"
                  />
                  
                  {/* Category Tag overlay */}
                  <span className={`absolute bottom-1 ${'right-1'} bg-black/60 backdrop-blur-xxs text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase`}>
                    {(CATEGORIES_LABELS_MAP[lang] as any)?.[item.category] || item.category}
                  </span>
                </div>

                {/* Food Details and Order Widget */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div style={{ textAlign: 'right' }}>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-xs sm:text-sm font-black text-slate-805 leading-tight flex flex-wrap items-center gap-2 justify-start">
                        <span>{dishName}</span>
                        <span className="inline-block bg-slate-100 text-slate-500 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                          {(CATEGORIES_LABELS_MAP[lang] as any)?.[item.category] || item.category}
                        </span>
                      </h3>
                      {canModifyMenu && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDish(item)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-all"
                            title={"تعديل الصنف"}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmDishId(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-all"
                            title={"حذف الصنف"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-semibold leading-normal mt-1 block max-h-12 overflow-hidden text-ellipsis line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {item.sizes && item.sizes.length > 0 ? (
                    <div className="space-y-2 mt-3 w-full border-t border-slate-50 pt-3">
                      <p className="text-[10px] font-black text-slate-550 mb-1" style={{ textAlign: 'right' }}>
                        {"📐 الوحدات والأحجام المتوفرة:"}
                      </p>
                   
                      {/* Prepend Base/Standard Unit if item has price */}
                      {item.price > 0 && (() => {
                        const addedForBase = cartItemOf(item.id);
                        return (
                          <div 
                            className="flex items-center justify-between gap-2 bg-slate-50/70 p-1.5 px-2.5 rounded-xl border border-slate-100 hover:border-orange-100 transition-colors"
                          >
                            <div className="min-w-0" style={{ textAlign: 'right' }}>
                              <span className="text-xs font-bold text-slate-800 block">
                                {"الوحدة الأساسية"}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] font-black text-[#f94c10] font-mono">
                                  {item.price.toFixed(0)} {t('egp')}
                                </span>
                                {item.originalPrice && (
                                  <span className="text-[9px] text-slate-400 line-through">
                                    {item.originalPrice.toFixed(0)} {t('egp')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              {addedForBase ? (
                                <div className="flex items-center bg-white rounded-full p-0.5 select-none border border-slate-200" style={{ direction: 'ltr' }}>
                                  <button
                                    onClick={() => onRemoveFromCart(item.id)}
                                    className="h-5.5 w-5.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition-all cursor-pointer font-bold text-[10px]"
                                  >
                                    <Minus className="h-2.5 w-2.5" />
                                  </button>
                                  <span className="w-5 text-center text-xs font-black text-slate-800">
                                    {addedForBase.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleAddToCartSecure(item, restaurant)}
                                    disabled={!isOpen}
                                    className={`h-5.5 w-5.5 rounded-full bg-[#f94c10] text-white flex items-center justify-center shrink-0 transition-all font-bold text-[10px] ${isOpen ? "hover:bg-[#e03d08] cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : (
                                isOpen ? (
                                  <button
                                    onClick={() => handleAddToCartSecure(item, restaurant)}
                                    className="flex items-center gap-1 bg-[#f94c10] hover:bg-[#e03d08] hover:scale-102 text-white font-black text-[10px] px-2.5 py-1 rounded-full cursor-pointer transition-all shadow-xxs"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                    <span>{'شيل'}</span>
                                  </button>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {'مغلق'}
                                  </span>
                                   )
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {item.sizes.map((sz) => {
                        const addedForSize = cartItemOf(item.id, sz.id);
                        return (
                          <div 
                            key={sz.id} 
                            className="flex items-center justify-between gap-2 bg-slate-50/70 p-1.5 px-2.5 rounded-xl border border-slate-100 hover:border-orange-100 transition-colors"
                          >
                            <div className="min-w-0" style={{ textAlign: 'right' }}>
                              <span className="text-xs font-bold text-slate-800 block">
                                {sz.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] font-black text-[#f94c10] font-mono">
                                  {sz.price.toFixed(0)} {t('egp')}
                                </span>
                                {sz.originalPrice && (
                                  <span className="text-[9px] text-slate-400 line-through">
                                    {sz.originalPrice.toFixed(0)} {t('egp')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              {addedForSize ? (
                                <div className="flex items-center bg-white rounded-full p-0.5 select-none border border-slate-200" style={{ direction: 'ltr' }}>
                                  <button
                                    onClick={() => onRemoveFromCart(item.id, sz.id)}
                                    className="h-5.5 w-5.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition-all cursor-pointer font-bold text-[10px]"
                                  >
                                    <Minus className="h-2.5 w-2.5" />
                                  </button>
                                  <span className="w-5 text-center text-xs font-black text-slate-800">
                                    {addedForSize.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleAddToCartSecure(item, restaurant, sz)}
                                    disabled={!isOpen}
                                    className={`h-5.5 w-5.5 rounded-full bg-[#f94c10] text-white flex items-center justify-center shrink-0 transition-all font-bold text-[10px] ${isOpen ? "hover:bg-[#e03d08] cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : (
                                isOpen ? (
                                  <button
                                    onClick={() => handleAddToCartSecure(item, restaurant, sz)}
                                    className="flex items-center gap-1 bg-[#f94c10] hover:bg-[#e03d08] hover:scale-102 text-white font-black text-[10px] px-2.5 py-1 rounded-full cursor-pointer transition-all shadow-xxs"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                    <span>{'شيل'}</span>
                                  </button>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {'مغلق'}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`flex items-center justify-between gap-4 mt-3 w-full ${'flex-row-reverse'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-[#0f172a] text-sm sm:text-base">
                          {item.price.toFixed(0)} {t('egp')}
                        </span>
                        {item.originalPrice && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {item.originalPrice.toFixed(0)} {t('egp')}
                          </span>
                        )}
                      </div>

                      {/* Highly responsive cart selection counter */}
                      {added ? (
                        <div className="flex items-center bg-slate-100 rounded-full p-1 select-none border border-slate-200" style={{ direction: 'ltr' }}>
                          <button
                            onClick={() => onRemoveFromCart(item.id)}
                            className="h-6 w-6 rounded-full bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-150 transition-all cursor-pointer font-bold"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-800">
                            {added.quantity}
                          </span>
                          <button
                            onClick={() => handleAddToCartSecure(item, restaurant)}
                            disabled={!isOpen}
                            className={`h-6 w-6 rounded-full bg-white text-slate-700 flex items-center justify-center shrink-0 border border-slate-150 transition-all font-bold ${isOpen ? "hover:bg-slate-50 cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        isOpen ? (
                          <button
                            onClick={() => handleAddToCartSecure(item, restaurant)}
                            className="flex items-center gap-1 bg-[#f94c10] hover:bg-[#e03d08] hover:scale-102 text-white font-extrabold text-xs px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full cursor-pointer transition-all shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{'شيل وحط'}</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center gap-1 bg-slate-200 text-slate-400 font-extrabold text-xs px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full cursor-not-allowed transition-all"
                          >
                            <span>{'مغلق 🚪'}</span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* DISH ADD / EDIT MODAL (FOR AUTHORIZED MENU MANAGERS)     */}
      {/* ──────────────────────────────────────────────────────── */}
      {(editingDishItem || isAddingNewDish) && (
        <MenuItemEditor
          item={editingDishItem}
          restaurantId={restaurant.id}
          categoriesList={categoriesList}
          defaultImage={restaurant.coverImage}
          onClose={() => { setEditingDishItem(null); setIsAddingNewDish(false); }}
          onSaved={async () => {
            if (onRefreshData) await onRefreshData();
            setSuccessToast('تم حفظ الصنف بنجاح.');
            setTimeout(() => setSuccessToast(''), 3000);
          }}
        />
      )}


      {/* ──────────────────────────────────────────────────────── */}
      {/* DELETE CONFIRMATION INTERSTITIAL MODAL                   */}
      {/* ──────────────────────────────────────────────────────── */}
      {deleteConfirmDishId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-105" dir={'rtl'}>
            <div className="flex items-center gap-3 text-red-650">
              <div className="bg-red-50 p-2.5 rounded-2xl">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-805">
                {'تأكيد حذف وجبة'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed text-right sm:text-left">
              {'هل أنت متأكد من رغبتك في حذف هذا الصنف من قائمة الطعام؟ هذا الإجراء فوري وسينعكس فورًا عند جميع المستخدمين.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteDishConfirm(deleteConfirmDishId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-sm transition-all animate-pulse"
              >
                {'نعم، احذف ⚠️'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmDishId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
              >
                {'تراجع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
