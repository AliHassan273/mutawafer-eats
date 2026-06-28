// RestaurantDetail.tsx
import React, { useState } from 'react';
import { ArrowLeft, Star, Clock, Truck, Plus, Minus, Search, Edit, Trash2, Sparkles } from 'lucide-react';
import { Restaurant, MenuItem, CartItem, Review } from '../types';
import { Language, getTranslation } from '../translations';
import { isRestaurantOpen } from './RestaurantCard';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
  cart: CartItem[];
  onAddToCart: (item: MenuItem, restaurantInstance: Restaurant, selectedSize?: any) => void;
  onRemoveFromCart: (itemId: string, selectedSizeId?: string, forceRemoveAll?: boolean) => void;
  lang: Language;
  onRefreshData?: () => Promise<void>;
  reviews?: Review[];
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
  lang,
  onRefreshData,
  reviews,
}: RestaurantDetailProps) {
  // ✅ تأكد من أن المنيو مصفوفة دائماً
  const menuItems = restaurant.menu || [];

  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [itemSearch, setItemSearch] = useState('');

  const t = (key: any, params?: any) => getTranslation(key, lang, params);

  const isAr = lang === 'ar';
  const isOpen = isRestaurantOpen(restaurant.openTime, restaurant.closeTime);

  // Dynamic average rating
  const dynamicRating = React.useMemo(() => {
    if (!reviews || reviews.length === 0) return restaurant.rating;
    const restReviews = reviews.filter((r) => r.restaurantId === restaurant.id);
    if (restReviews.length === 0) return restaurant.rating;
    const sum = restReviews.reduce((acc, r) => acc + (r.ratingFoodQuality || 5), 0);
    return Number((sum / restReviews.length).toFixed(1));
  }, [reviews, restaurant.id, restaurant.rating]);

  const handleAddToCartSecure = (item: MenuItem, rest: Restaurant, selectedSize?: any) => {
    if (!isOpen) {
      alert(isAr ? "عذراً، هذا المطعم مغلق حالياً وبرا أوقات العمل الرسمية المحددة." : "Sorry, this restaurant is currently closed.");
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

  // Modal & form states for inline dish editor
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [deleteConfirmDishId, setDeleteConfirmDishId] = useState<string | null>(null);

  // Toast notifications state
  const [successToast, setSuccessToast] = useState("");

  const [dishForm, setDishForm] = useState<{
    name: string;
    description: string;
    price: string;
    originalPrice: string;
    category: string;
    image: string;
    sizes: { id: string; name: string; price: number; originalPrice?: number }[];
  }>({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "Burgers",
    image: "",
    sizes: []
  });

  const handleOpenAddDish = () => {
    setEditingDishId(null);
    setDishForm({
      name: "",
      description: "",
      price: "120",
      originalPrice: "",
      category: "Burgers",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      sizes: []
    });
    setIsDishModalOpen(true);
  };

  const handleOpenEditDish = (item: MenuItem) => {
    setEditingDishId(item.id);
    setDishForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      originalPrice: item.originalPrice ? String(item.originalPrice) : "",
      category: item.category || "Burgers",
      image: item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      sizes: item.sizes ? [...item.sizes] : []
    });
    setIsDishModalOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyMenu) {
      alert(isAr ? "عفوًا، لا تملك الصلاحية لتعديل محتوى المنيو." : "You don't have permission to modify menu.");
      return;
    }

    try {
      let updatedMenu = [...menuItems];
      const numericPrice = Number(dishForm.price) || 0;
      const numericOriginalPrice = dishForm.originalPrice ? Number(dishForm.originalPrice) : undefined;

      const formattedDish = {
        name: dishForm.name.trim(),
        description: dishForm.description.trim(),
        price: numericPrice,
        originalPrice: numericOriginalPrice,
        category: dishForm.category.trim(),
        image: dishForm.image.trim() || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
        sizes: dishForm.sizes.map(s => ({ ...s, price: Number(s.price) || 0 }))
      };

      if (editingDishId) {
        updatedMenu = updatedMenu.map(d =>
          d.id === editingDishId ? { ...d, ...formattedDish } : d
        );
      } else {
        const newDish = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          ...formattedDish
        };
        updatedMenu.push(newDish);
      }

      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu: updatedMenu })
      });

      if (res.ok) {
        if (onRefreshData) {
          await onRefreshData();
        }
        setIsDishModalOpen(false);
        setSuccessToast(isAr ? "تم حفظ التعديلات بنجاح! 🎉" : "Menu changes successfully saved! 🎉");
        setTimeout(() => setSuccessToast(""), 3000);
      } else {
        alert("Failed to commit changes to the backend database.");
      }
    } catch (err) {
      console.error(err);
      alert(isAr ? "حدث خطأ أثناء حفظ التعديلات." : "Error saving menu option.");
    }
  };

  const handleDeleteDishConfirm = async (itemId: string) => {
    if (!canModifyMenu) return;

    try {
      const updatedMenu = menuItems.filter(d => d.id !== itemId);

      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu: updatedMenu })
      });

      if (res.ok) {
        if (onRefreshData) {
          await onRefreshData();
        }
        setDeleteConfirmDishId(null);
        setSuccessToast(isAr ? "تم حذف الصنف بنجاح! ⚠️" : "Dish deleted successfully! ⚠️");
        setTimeout(() => setSuccessToast(""), 3000);
      } else {
        alert(isAr ? "فشل حذف الصنف." : "Failed to delete the selected product.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // استخراج الفئات من المنيو
  const menuCategories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  // تصفية الأصناف
  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedSubCategory === 'All' || item.category === selectedSubCategory;
    const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(itemSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // دالة لمعرفة إذا كان الصنف في السلة
  const cartItemOf = (itemId: string, sizeId?: string) => {
    return cart.find(c =>
      c.menuItem.id === itemId &&
      ((!sizeId && !c.selectedSize) || (c.selectedSize?.id === sizeId))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Back navigation button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-[#f94c10] text-xs sm:text-sm font-semibold mb-6 group cursor-pointer transition-colors"
      >
        <ArrowLeft className={`h-4 w-4 transition-transform ${isAr ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
        <span>{t('backToHome')}</span>
      </button>

      {canModifyMenu && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl mb-6 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 bg-amber-100 rounded-lg text-amber-800 text-xs font-bold">🛠️ {isAr ? "تحرير القائمة" : "Menu Editor"}</span>
            <p className="text-xs font-bold text-slate-700 text-right sm:text-left">
              {isAr
                ? `مرحباً يا معلم ${currentAdmin.name}! يمكنك تعديل الأصناف أو إضافة وجبات جديدة لهذا المطعم فورياً.`
                : `Welcome ${currentAdmin.name}! You can modify existing items or add new dishes for this store.`}
            </p>
          </div>
          <button
            onClick={handleOpenAddDish}
            className="bg-[#f94c10] hover:bg-orange-600 text-white font-black text-xs px-4 py-2 rounded-full cursor-pointer transition-all shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? "إضافة صنف جديد بالمنيو" : "Add New dish"}</span>
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
            <h4 className="text-sm font-black text-slate-800">{isAr ? "عذراً، هذا المطعم مغلق حالياً ولا يستقبل طلبات جديدة! 🚫" : "Sorry, this restaurant is currently closed"}</h4>
            <p className="text-xs font-bold text-slate-500 mt-1 leading-normal">
              {isAr
                ? `المطعم خارج أوقات العمل الرسمية التي حددها الأدمن. نتشرف بخدمتكم اليوم خلال مواعيد العمل الرسمية: من ${restaurant.openTime} إلى ${restaurant.closeTime}.`
                : `This store is currently offline outside corporate business hours: ${restaurant.openTime} to ${restaurant.closeTime}.`}
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

          <div className={`absolute bottom-6 ${isAr ? 'right-6 text-right' : 'left-6 text-left'} right-6 text-white`}>
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
                <span className="text-sm font-extrabold text-[#0f172a] font-display">{dynamicRating}</span>
                <Star className="h-4 w-4 fill-current text-green-500 shrink-0" />
              </div>
            </div>

            <div className={`flex flex-col ${isAr ? 'border-r pr-6' : 'border-l pl-6'} border-slate-100`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('deliveryTime')}</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-[#0f172a] font-extrabold text-sm font-display">
                <Clock className="h-4 w-4 text-[#f94c10] shrink-0" />
                <span>{restaurant.deliveryTime.replace('min', t('min'))}</span>
              </div>
            </div>

            <div className={`flex flex-col ${isAr ? 'border-r pr-6' : 'border-l pl-6'} border-slate-100`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('deliveryFee')}</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-705 font-extrabold text-sm font-display">
                <Truck className="h-4 w-4 text-green-500 shrink-0" />
                <span>{restaurant.deliveryFee === 0 ? t('freeDelivery') : `${restaurant.deliveryFee.toFixed(0)} ${t('egp')}`}</span>
              </div>
            </div>
          </div>

          {/* Micro Search within Menu */}
          <div className="relative w-full sm:w-64">
            <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400`} />
            <input
              type="text"
              placeholder={isAr ? 'دور في المنيو...' : 'Search dishes...'}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className={`w-full bg-slate-50 border-0 text-slate-800 placeholder-slate-400 rounded-full py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-medium ${
                isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'
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
            {isAr ? 'ملقيناش أكلات مطابقة للبحث أو التثبيت.' : 'No menu items match your search or filter configuration.'}
          </p>
          <button
            onClick={() => { setItemSearch(''); setSelectedSubCategory('All'); }}
            className="text-xs text-[#f94c10] font-bold mt-2 hover:underline cursor-pointer"
          >
            {isAr ? 'إعادة تعيين القائمة' : 'Reset filter'}
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
                  <span className={`absolute bottom-1 ${isAr ? 'right-1' : 'left-1'} bg-black/60 backdrop-blur-xxs text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase`}>
                    {(CATEGORIES_LABELS_MAP[lang] as any)?.[item.category] || item.category}
                  </span>
                </div>

                {/* Food Details and Order Widget */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div style={{ textAlign: isAr ? 'right' : 'left' }}>
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
                            title={isAr ? "تعديل الصنف" : "Edit Dish"}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmDishId(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-all"
                            title={isAr ? "حذف الصنف" : "Delete Dish"}
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
                      <p className="text-[10px] font-black text-slate-550 mb-1" style={{ textAlign: isAr ? 'right' : 'left' }}>
                        {isAr ? "📐 الوحدات والأحجام المتوفرة:" : "📐 Available Units & Sizes:"}
                      </p>

                      {item.sizes.map((sz) => {
                        const addedForSize = cartItemOf(item.id, sz.id);
                        return (
                          <div
                            key={sz.id}
                            className="flex items-center justify-between gap-2 bg-slate-50/70 p-1.5 px-2.5 rounded-xl border border-slate-100 hover:border-orange-100 transition-colors"
                          >
                            <div className="min-w-0" style={{ textAlign: isAr ? 'right' : 'left' }}>
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
                                    <span>{isAr ? 'شيل' : 'Add'}</span>
                                  </button>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {isAr ? 'مغلق' : 'Closed'}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`flex items-center justify-between gap-4 mt-3 w-full ${isAr ? 'flex-row-reverse' : ''}`}>
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
                            <span>{isAr ? 'شيل وحط' : 'Add'}</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center gap-1 bg-slate-200 text-slate-400 font-extrabold text-xs px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full cursor-not-allowed transition-all"
                          >
                            <span>{isAr ? 'مغلق 🚪' : 'Closed 🚪'}</span>
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
      {isDishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-105" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <h3 className="font-display font-black text-sm sm:text-base text-slate-800 flex items-center gap-2">
                <span className="p-1 px-1.5 bg-orange-100 rounded-lg text-[#f94c10]">🍔</span>
                <span>
                  {editingDishId
                    ? (isAr ? "تعديل بيانات وجبة قائمة الطعام" : "Edit Menu Item")
                    : (isAr ? "إضافة صنف وجبة جديد بالمنيو" : "Add New Menu Item")
                  }
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDishModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer animate-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="flex flex-col flex-grow min-h-0 overflow-hidden">
              {/* Scrollable inputs wrapper */}
              <div className="space-y-4 overflow-y-auto pr-1.5 pl-0.5 flex-grow pb-4 scrollbar-thin">
                {/* Item Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">
                    {isAr ? "اسم الوجبة بالصنف *" : "Dish Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={dishForm.name}
                    onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                    placeholder={isAr ? "مثال: تشيكن رويال الأسطورية" : "e.g., Legendary Royal Chicken"}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#f94c10] focus:ring-1 focus:ring-[#f94c10] transition-all"
                  />
                </div>

                {/* Item Description */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">
                    {isAr ? "المكونات ووصف الوجبة *" : "Description & Ingredients *"}
                  </label>
                  <textarea
                    required
                    value={dishForm.description}
                    onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                    placeholder={isAr ? "مثال: صدر دجاج مع طبقة جبنة فيلادلفيا، صوص رانش مدخن مع الخيار المخلل والتشيدر الذائبة..." : "Describe toppings, weights, etc."}
                    rows={3}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#f94c10] focus:ring-1 focus:ring-[#f94c10] transition-all resize-none"
                  />
                </div>

                {/* Prices side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">
                      {isAr ? "السعر الفعلي (بالجنيه) *" : "Active Price (EGP) *"}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={dishForm.price}
                      onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#f94c10] focus:ring-1 focus:ring-[#f94c10] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">
                      {isAr ? "السعر المشطوب (قبل الخصم)" : "Original Price (Strikeout)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={isAr ? "اختياري" : "Optional"}
                      value={dishForm.originalPrice}
                      onChange={(e) => setDishForm({ ...dishForm, originalPrice: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#f94c10] focus:ring-1 focus:ring-[#f94c10] transition-all"
                    />
                  </div>
                </div>

                {/* Categories selection list */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">
                    {isAr ? "فئة الطعام (القسم) *" : "Menu Category (Section) *"}
                  </label>
                  <select
                    value={dishForm.category}
                    onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-855 focus:outline-none focus:border-[#f94c10] focus:ring-1 focus:ring-[#f94c10] transition-all"
                  >
                    <option value="Burgers">{isAr ? "برجر 🍔" : "Burgers"}</option>
                    <option value="Pizza">{isAr ? "بيتزا 🍕" : "Pizza"}</option>
                    <option value="Salads">{isAr ? "سلطات 🥗" : "Salads"}</option>
                    <option value="Sushi">{isAr ? "سوشي 🍣" : "Sushi"}</option>
                    <option value="Ramen">{isAr ? "رامين 🍜" : "Ramen"}</option>
                    <option value="Dessert">{isAr ? "حلويات 🍰" : "Dessert"}</option>
                    <option value="Sides">{isAr ? "المقبلات والجانبية 🍟" : "Sides"}</option>
                    <option value="Drinks">{isAr ? "مشروبات فريش 🥤" : "Drinks"}</option>
                  </select>
                </div>

                {/* Dish Photo Image link */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">
                    {isAr ? "صورة الوجبة (رابط ويب) *" : "Dish Web Photo Link *"}
                  </label>
                  <input
                    type="url"
                    required
                    value={dishForm.image}
                    onChange={(e) => setDishForm({ ...dishForm, image: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#f94c10] focus:ring-1 focus:ring-[#f94c10] transition-all"
                  />
                  <p className="text-[9px] text-slate-400">
                    {isAr
                      ? "يمكنك لصق رابط صورة جاهزة مباشرة لتمثيل الوجبة."
                      : "Paste any valid web URL of an image file."
                    }
                  </p>
                </div>

                {/* Sizes / Units Management - محسنة بالعربية */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="block text-xs font-black text-slate-700">
                      {isAr ? "📐 وحدات وأحجام الصنف المتوفرة" : "📐 Item Custom Portions/Sizes"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sizeName = isAr ? "حجم جديد" : "New Size";
                        setDishForm({
                          ...dishForm,
                          sizes: [
                            ...dishForm.sizes,
                            {
                              id: `size_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                              name: sizeName,
                              price: Number(dishForm.price) || 100
                            }
                          ]
                        });
                      }}
                      className="text-[10px] bg-orange-50 hover:bg-orange-100/80 text-[#f94c10] font-black px-2 py-1 rounded-lg border border-orange-100/50 cursor-pointer transition-all shrink-0"
                    >
                      {isAr ? "➕ إضافة حجم/وحدة" : "➕ Add Size"}
                    </button>
                  </div>

                  {dishForm.sizes.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-medium pb-1">
                      {isAr
                        ? "لا توجد أحجام لهذا الصنف بعد. يتم استخدام السعر الرئيسي. (اضغط على إضافة حجم بالمنيو لتقسيمه)"
                        : "No size variants added yet. Falls back to standard main price."
                      }
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 pb-1">
                      {dishForm.sizes.map((sz, index) => (
                        <div key={sz.id} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 p-2 rounded-xl border border-slate-100 relative">
                          {/* Size Name inputs */}
                          <div className="col-span-4">
                            <input
                              type="text"
                              required
                              placeholder={isAr ? "وسط / عائلي" : "e.g., Medium / Family"}
                              value={sz.name}
                              onChange={(e) => {
                                const updated = [...dishForm.sizes];
                                updated[index].name = e.target.value;
                                setDishForm({ ...dishForm, sizes: updated });
                              }}
                              className="w-full text-[10.5px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 outline-none focus:border-[#f94c10]"
                            />
                          </div>

                          {/* Size Price inputs */}
                          <div className="col-span-3">
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder={isAr ? "سعر" : "Price"}
                              value={sz.price || ''}
                              onChange={(e) => {
                                const updated = [...dishForm.sizes];
                                updated[index].price = Number(e.target.value) || 0;
                                setDishForm({ ...dishForm, sizes: updated });
                              }}
                              className="w-full text-[10.5px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 outline-none focus:border-[#f94c10]"
                            />
                          </div>

                          {/* Optional strike price */}
                          <div className="col-span-3">
                            <input
                              type="number"
                              min="0"
                              placeholder={isAr ? "شطب" : "Strike"}
                              value={sz.originalPrice || ''}
                              onChange={(e) => {
                                const updated = [...dishForm.sizes];
                                updated[index].originalPrice = e.target.value ? Number(e.target.value) : undefined;
                                setDishForm({ ...dishForm, sizes: updated });
                              }}
                              className="w-full text-[10.5px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 outline-none focus:border-[#f94c10]"
                            />
                          </div>

                          {/* Delete single size button */}
                          <div className="col-span-2 flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = dishForm.sizes.filter((_, idx) => idx !== index);
                                setDishForm({ ...dishForm, sizes: updated });
                              }}
                              className="p-1 px-1.5 bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg cursor-pointer transition-colors text-[9px] font-bold"
                              title={isAr ? "حذف" : "Delete"}
                            >
                              {isAr ? "حذف" : "Del"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="submit"
                  className="flex-1 bg-[#f94c10] hover:bg-[#e03d08] text-white font-extrabold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all shadow-sm"
                >
                  {isAr ? "حفظ وتثبيت بالبرنامج ✅" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDishModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
                >
                  {isAr ? "تراجع" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* DELETE CONFIRMATION INTERSTITIAL MODAL                   */}
      {/* ──────────────────────────────────────────────────────── */}
      {deleteConfirmDishId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-105" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3 text-red-650">
              <div className="bg-red-50 p-2.5 rounded-2xl">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-805">
                {isAr ? 'تأكيد حذف وجبة' : 'Confirm Dish Deletion'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed text-right sm:text-left">
              {isAr
                ? 'هل أنت متأكد من رغبتك في حذف هذا الصنف من قائمة الطعام؟ هذا الإجراء فوري وسينعكس فورًا عند جميع المستخدمين.'
                : 'Are you sure you want to delete this menu item? This action is immediate and will reflect across all client devices.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteDishConfirm(deleteConfirmDishId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-sm transition-all animate-pulse"
              >
                {isAr ? 'نعم، احذف ⚠️' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmDishId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}