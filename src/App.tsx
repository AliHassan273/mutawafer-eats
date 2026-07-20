import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, Plus } from 'lucide-react';
import Header from './components/Header';
import { saveToken, clearToken, fetchWithRetry } from './utils/fetchHelper';
import CategoryList from './components/CategoryList';
import PromoBanners from './components/PromoBanners';
import Logo from './components/Logo';
import RestaurantCard, { isRestaurantOpen } from './components/RestaurantCard';
import RestaurantDetail from './components/RestaurantDetail';
import CartSidebar from './components/CartSidebar';
import CheckoutModal from './components/CheckoutModal';
import AuthModal from './components/AuthModal';
import OrderTracker from './components/OrderTracker';
import AdminPage from './components/AdminPage';
import CaptainPage from './components/CaptainPage';
import MyOrdersPage from './components/MyOrdersPage';
import BestSellersAndReviews from './components/BestSellersAndReviews';
import { RESTAURANTS, CATEGORIES } from './data';
import { Restaurant, MenuItem, CartItem, Order, Review } from './types';
import { lang, getTranslation } from './translations';
import { useMemo } from 'react';


const DISH_NAMES_MAP: Record<string, string> = {
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
};

const RESTAURANT_NAMES_MAP: Record<string, string> = {
  'Big Bun Burger Bar': 'برجر بار بيج بن 🍔',
  'Green Leaf Salads': 'سلطة الورقة الخضرا 🥗',
  'Sakura Sushi House': 'بيت سوشي ساكورا 🍣',
  'Dragon Ramen Lounge': 'لاونج تنين الرامين 🍜',
  'Sweet Delight Desserts': 'حلويات البهجة والسرور 🍦',
};

export default function App() {
  const [address, setAddress] = useState('قطعة ٩٢، إطلالة النيل بالزمالك');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [restPageIndex, setRestPageIndex] = useState(0);
  const restaurantRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRestPageIndex(0);
  }, [selectedCategory, searchQuery]);
  
  // Dynamic Restaurants state synchronized with server DB
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  // Navigation Routing States
  const [activeView, setActiveView] = useState<'home' | 'restaurant' | 'tracker' | 'admin' | 'captain' | 'about' | 'my-orders'>('home');
  const [viewHistory, setViewHistory] = useState<string[]>([]);

  // ✅ navigate with history tracking
  const navigateTo = (view: 'home' | 'restaurant' | 'tracker' | 'admin' | 'captain' | 'about' | 'my-orders') => {
    setViewHistory(prev => [...prev.slice(-9), activeView]);
    setActiveView(view);
    // ✅ ادفع state للـ browser history عشان زرار الرجوع يشتغل
    window.history.pushState({ view }, '', window.location.pathname);
  };

  const goBack = () => {
    const prev = viewHistory[viewHistory.length - 1];
    if (prev) {
      setViewHistory(h => h.slice(0, -1));
      setActiveView(prev as any);
    } else {
      setActiveView('home');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // ✅ زرار الرجوع في المتصفح يشغّل goBack بدل ما يخرج
  React.useEffect(() => {
    const handlePopState = () => { goBack(); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewHistory]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Cart and orders persistence
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => {
    // ✅ استرجع الطلبات من localStorage عند أول تحميل
    try {
      const stored = localStorage.getItem('mutafer_orders_cache');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // ✅ احفظ الطلبات في localStorage كل ما تتغير
  React.useEffect(() => {
    try {
      // بس احفظ الطلبات بتاعة المستخدم الحالي
      localStorage.setItem('mutafer_orders_cache', JSON.stringify(orders.slice(0, 50)));
    } catch {}
  }, [orders]);
  const [reviews, setReviews] = useState<Review[]>([]);
  // translation helper used throughout the app
  const t = (key: any, params?: any) => getTranslation(key, lang as any, params);
  const [settings, setSettings] = useState<{
    whatsappNumber: string;
    deliveryPricingType?: 'area' | 'distance';
    distanceBaseFee?: number;
    distanceFeePerKm?: number;
    deliveryCommissionType?: 'flat' | 'percentage';
    deliveryCommissionValue?: number;
    aboutUsContent?: string;
    logoImage?: string;
    deliveryOptions: { id: string; name: string; fee: number }[];
    coupons?: { id: string; code: string; discountType: 'percentage' | 'flat'; discountValue: number; minOrder: number; isActive: boolean }[];
    categories?: { id: string; name: string; nameAr: string; icon: string }[];
  }>({
    whatsappNumber: "201016789012",
    deliveryPricingType: "area",
    distanceBaseFee: 10,
    distanceFeePerKm: 5,
    deliveryCommissionType: "flat",
    deliveryCommissionValue: 15,
    aboutUsContent: "تطبيق مسافر هو المنصة الرائدة لتوصيل الطعام الفاخر والوجبات الطازجة بأقصى سرعة واحترافية. نسعى دائماً لتجربة مستخدم لا ميل لها عبر تتبع فوري للطلبات وكباتن توصيل محترفين.",
    logoImage: "",
    deliveryOptions: [
      { id: "reg_1", name: "الزمالك", fee: 15 },
      { id: "reg_2", name: "الدقي", fee: 20 },
      { id: "reg_3", name: "المهندسين", fee: 25 },
      { id: "reg_4", name: "وسط البلد", fee: 20 },
      { id: "reg_5", name: "6 أكتوبر", fee: 40 }
    ],
    coupons: [
      { id: "cp_1", code: "FIRST50", discountType: "percentage", discountValue: 50, minOrder: 0, isActive: true },
      { id: "cp_2", code: "EATS10", discountType: "flat", discountValue: 30, minOrder: 150, isActive: true }
    ],
    categories: [
      { id: 'all', name: 'All Eats', nameAr: 'كل الأكلات 🍽️', icon: '🍽️' },
      { id: 'burgers', name: 'Burgers', nameAr: 'برجر بجمدان 🍔', icon: '🍔' },
      { id: 'pizza', name: 'Pizza', nameAr: 'بيتزا حكاية 🍕', icon: '🍕' },
      { id: 'salads', name: 'Salads', nameAr: 'سلطات فريش 🥗', icon: '🥗' },
      { id: 'sushi', name: 'Sushi', nameAr: 'سوشي دلع 🍣', icon: '🍣' },
      { id: 'ramen', name: 'Ramen', nameAr: 'رامين ياباني 🍜', icon: '🍜' },
      { id: 'dessert', name: 'Dessert', nameAr: 'حلويات وفرفشة 🍦', icon: '🍦' },
      { id: 'drinks', name: 'Drinks', nameAr: 'مشروبات منعشة 🥤', icon: '🥤' },
      { id: 'sides', name: 'Sides', nameAr: 'مقبلات جانبية 🍟', icon: '🍟' },
      { id: 'offers', name: 'Special Offers', nameAr: 'عروض دمار 🏷️', icon: '🏷️' }
    ]
  });

  // Modal overlays
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; phone: string; role?: string; canManageRestaurants?: boolean; canManageMenu?: boolean } | null>(() => {
    try {
      const savedUser = localStorage.getItem("mutafer_user_profile");
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      const savedAdmin = localStorage.getItem("mutafer_logged_in_admin");
      if (savedAdmin) {
        const admin = JSON.parse(savedAdmin);
        return {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          phone: '',
          role: 'admin',
          primary: admin.role === 'primary',
          canManageRestaurants: admin.canManageRestaurants,
          canManageMenu: admin.canManageMenu
        };
      }
    } catch {
      return null;
    }
    return null;
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Promo triggers
  const [copiedPromoToast, setCopiedPromoToast] = useState('');

  // Calculate top 4 best sellers dynamically
  const bestSellers = useMemo(() => {
    const counts: Record<string, { item: MenuItem; count: number; restaurant: Restaurant }> = {};
    if (Array.isArray(orders)) {
      orders.forEach(ord => {
        if (ord && Array.isArray(ord.items)) {
          ord.items.forEach(c => {
            if (!c.menuItem || !c.menuItem.id) return;
            const id = c.menuItem.id;
            if (!counts[id]) {
              counts[id] = { item: c.menuItem, count: 0, restaurant: ord.restaurant };
            }
            counts[id].count += c.quantity;
          });
        }
      });
    }
    
    const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
    if (sorted.length > 0) {
      return sorted.slice(0, 4);
    }
    
    // Fallback if no orders have been placed yet: take items with category 'Popular', 'Offers', 'burgers' or 'pizza'
    const popularList: { item: MenuItem; count: number; restaurant: Restaurant }[] = [];
    if (Array.isArray(restaurants)) {
      restaurants.forEach(rest => {
        if (Array.isArray(rest.menu)) {
          rest.menu.forEach(item => {
            if (item.category === 'Popular' || item.category === 'Offers' || item.category === 'burgers' || item.category === 'pizza') {
              popularList.push({ item, count: 5, restaurant: rest });
            }
          });
        }
      });
    }
    return popularList.slice(0, 4);
  }, [orders, restaurants]);


  // Synchronize dynamic lists and settings on load
  const loadInitialData = async () => {
    try {
      // 1. Fetch Restaurants
      const res = await fetchWithRetry('/api/restaurants');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setRestaurants(data);
        } else {
          setRestaurants(RESTAURANTS);
        }
      } else {
        setRestaurants(RESTAURANTS);
      }
    } catch {
      setRestaurants(RESTAURANTS);
    } finally {
      setLoadingRestaurants(false);
    }

    try {
      // 2. Fetch Settings
      const setRes = await fetchWithRetry('/api/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData) setSettings(setData);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }

    try {
      // 3. Fetch orders
      // ✅ اجيب الطلبات من السيرفر وادمجها مع المحفوظة محلياً
      if (currentUser) {
        const ordRes = await fetchWithRetry('/api/orders');
        if (ordRes.ok) {
          const ordData = await ordRes.json();
          setOrders(prev => {
            // ادمج الطلبات الجديدة من السيرفر مع المحفوظة محلياً
            const serverIds = new Set(ordData.map((o: any) => o.id));
            const localOnly = prev.filter(o => !serverIds.has(o.id));
            return [...ordData, ...localOnly].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        }
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }

    try {
      // 4. Fetch reviews
      const revRes = await fetchWithRetry('/api/reviews');
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviews(revData);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update default address automatically based on selected language
  useEffect(() => {
    setAddress('قطعة ٩٢، إطلالة النيل بالزمالك');
  }, [lang]);



  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    if (activeView !== 'home') {
      setActiveView('home');
    }
  };

  const handleOpenRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setActiveView('restaurant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSizeKey = (sz?: any) => sz ? (sz.id || sz.name) : null;

  const handleAddToCart = (item: MenuItem, restaurantInstance: any, selectedSize?: any) => {
    // ✅ Ensure size has id (fallback to name)
    const normalizedSize = selectedSize ? { ...selectedSize, id: selectedSize.id || selectedSize.name } : undefined;
    setCart((prevCart) => {
      const existing = prevCart.find(
        (c) => c.menuItem.id === item.id && getSizeKey(c.selectedSize) === getSizeKey(normalizedSize)
      );
      if (existing) {
        return prevCart.map((c) =>
          c.menuItem.id === item.id && getSizeKey(c.selectedSize) === getSizeKey(normalizedSize)
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [
        ...prevCart,
        {
          menuItem: item,
          selectedSize: normalizedSize,
          quantity: 1,
          restaurantId: restaurantInstance.id,
          restaurantName: restaurantInstance.name,
        },
      ];
    });
  };

    const handleRemoveFromCart = (itemId: string, selectedSizeId?: string, forceRemoveAll = false) => {
    setCart((prevCart) => {
      const item = prevCart.find(
        (c) => 
          c.menuItem.id === itemId && 
          ((!selectedSizeId && !c.selectedSize) || getSizeKey(c.selectedSize) === selectedSizeId)
      );
      if (!item) return prevCart;

      if (item.quantity === 1 || forceRemoveAll) {
        return prevCart.filter(
          (c) => 
            !(c.menuItem.id === itemId && 
              ((!selectedSizeId && !c.selectedSize) || getSizeKey(c.selectedSize) === selectedSizeId))
        );
      }

       return prevCart.map((c) =>
        c.menuItem.id === itemId && 
        ((!selectedSizeId && !c.selectedSize) || (c.selectedSize?.id === selectedSizeId))
          ? { ...c, quantity: c.quantity - 1 }
          : c
      );
    });
  };

  const handlePromoCopyNotification = (code: string) => {
    setCopiedPromoToast(code);
    setTimeout(() => setCopiedPromoToast(''), 4500);
  };

  const handleInitiateCheckout = () => {
    if (!currentUser) {
      setIsCartOpen(false);
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleLogout = () => {
  setCurrentUser(null);
  clearToken();                                          // ← مسح الـ JWT token
  localStorage.removeItem("mutafer_user_profile");       // ← الاسم الجديد
  localStorage.removeItem("mutafer_logged_in_user");     // ← للتوافق مع القديم
  localStorage.removeItem("mutafer_logged_in_admin");
  setActiveView('home');
};

  const handleAuthSuccess = (user: { id: string; name: string; email: string; phone: string; role?: string; status?: string }) => {
  localStorage.removeItem("mutafer_logged_in_admin");
  
  const safeProfile = {
    id:     user.id,
    name:   user.name,
    email:  user.email  || '',
    phone:  user.phone  || '',
    role:   user.role   || 'customer',
    status: user.status || 'approved',
  };
  
  setCurrentUser(safeProfile);
  localStorage.setItem("mutafer_user_profile", JSON.stringify(safeProfile));
  if (cart.length > 0) setIsCheckoutOpen(true);
};

  const handleAdminAuthSuccess = (admin: any, token?: string) => {
  localStorage.removeItem("mutafer_user_profile");
  localStorage.removeItem("mutafer_logged_in_user");
  
  if (token) saveToken(token);  // ← احفظ الـ JWT token
  
  const safeAdminProfile = {
    id:                   admin.id,
    name:                 admin.name,
    email:                admin.email,
    phone:                '',
    role:                 'admin',
    primary:              admin.role === 'primary',
    canManageRestaurants: admin.canManageRestaurants,
    canManageMenu:        admin.canManageMenu,
  };
  
  setCurrentUser(safeAdminProfile);
  localStorage.setItem("mutafer_user_profile", JSON.stringify(safeAdminProfile));
  // ✅ لا نحفظ الـ admin object الكامل — فيه password hash
};

  const handleFinalizeOrder = async (
    customerName: string,
    customerPhone: string,
    notes: string,
    paymentMethod: string,
    calculatedDeliveryFee: number,
    fullDeliveryAddress: string,
    paymentDetails?: string,
    vodafoneFee?: number,
    doorstepDelivery?: boolean
  ) => {
    if (cart.length === 0) return;

    const primaryRestId = cart[0].restaurantId;
    const associatedRest = restaurants.find((r) => r.id === primaryRestId) || RESTAURANTS[0];

    const subtotal = cart.reduce((tot, item) => tot + item.menuItem.price * item.quantity, 0);
    const itemDiscount = 0; // Handled directly inside calculations now

    const orderId = `order_${Math.random().toString(36).substr(2, 9)}`;
    const doorstepFee = doorstepDelivery ? 5 : 0;
    const totalAmount = Math.max(0, subtotal + calculatedDeliveryFee + (vodafoneFee || 0) + doorstepFee - itemDiscount);

    const newOrder: Order = {
      id: orderId,
      restaurant: associatedRest,
      items: [...cart],
      subtotal,
      deliveryFee: calculatedDeliveryFee,
      discount: itemDiscount,
      total: totalAmount,
      status: 'Received',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName,
      customerPhone,
      deliveryAddress: fullDeliveryAddress,
      eta: 24,
      paymentMethod,
      paymentDetails,
      vodafoneFee,
      doorstepDelivery,
    };

    try {
      const res = await fetchWithRetry('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    // ✅ بيانات الطلب فقط — الأسعار بتتحسب في السيرفر
    restaurantId:    primaryRestId,
    items:           cart.map(c => ({ 
                       menuItem: { id: c.menuItem.id },  // فقط الـ ID
                       quantity: c.quantity 
                     })),
    deliveryFee:     calculatedDeliveryFee,
    customerName,
    customerPhone,
    deliveryAddress: fullDeliveryAddress,
    paymentMethod,
    paymentDetails,
    notes,
    vodafoneFee,
    doorstepDelivery,
  }),
});
      if (res.ok) {
        const persisted = await res.json();
        setOrders((prev) => [persisted, ...prev]);
        setSelectedOrder(persisted);

        // Keep track of placed order IDs locally in localStorage as backup
        try {
          const stored = localStorage.getItem('mutafer_customer_order_ids');
          const idsList = stored ? JSON.parse(stored) : [];
          if (!idsList.includes(persisted.id)) {
            idsList.push(persisted.id);
            localStorage.setItem('mutafer_customer_order_ids', JSON.stringify(idsList));
          }
        } catch (e) {
          console.error("Failed to save guest order id:", e);
        }

      } else {
        setOrders((prev) => [newOrder, ...prev]);
        setSelectedOrder(newOrder);
      }
    } catch (err) {
      console.error("Failed to post order:", err);
      setOrders((prev) => [newOrder, ...prev]);
      setSelectedOrder(newOrder);
    }

    setCart([]); // Clean basket
    setIsCheckoutOpen(false);
    setActiveView('tracker');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: 'Pending' | 'Received' | 'Preparing' | 'OutForDelivery' | 'Delivered',
    courierName?: string,
    courierPhone?: string
  ) => {
    try {
      const res = await fetchWithRetry(`/api/orders/${orderId}/status`, {
  method: 'PUT',
  body: JSON.stringify({ status: newStatus, courierName, courierPhone }),
});
      if (res.ok) {
        const updated = await res.json();
        setOrders((prevOrders) =>
          prevOrders.map((ord) => (ord.id === orderId ? updated : ord))
        );
        setSelectedOrder((current) => {
          if (current && current.id === orderId) {
            return updated;
          }
          return current;
        });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      // Local fallback
      setOrders((prevOrders) =>
        prevOrders.map((ord) => (ord.id === orderId ? { 
          ...ord, 
          status: newStatus,
          ...(courierName ? { courierName } : {}),
          ...(courierPhone ? { courierPhone } : {}),
        } : ord))
      );
      setSelectedOrder((current) => {
        if (current && current.id === orderId) {
          return { 
            ...current, 
            status: newStatus,
            ...(courierName ? { courierName } : {}),
            ...(courierPhone ? { courierPhone } : {}),
          };
        }
        return current;
      });
    }
  };

  // Filter restaurants list based on category and search query
  const filteredRestaurants = restaurants.filter((rest) => {
    // 1. Check if category matches
    let matchesCategory = true;
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'offers') {
        // Special Offers can match if there is an active discount / promo
        matchesCategory = !!rest.promo;
      } else {
        const targetCat = selectedCategory.toLowerCase().trim();
        const hasMatchingRestCategory = rest.categories && rest.categories.some(c => c.toLowerCase().trim() === targetCat);
        
        const hasMatchingMenuItem = rest.menu && rest.menu.some(item => {
          const itemCat = (item.category || '').toLowerCase().trim();
          return itemCat === targetCat ||
                 (targetCat === 'burgers' && (itemCat === 'burger' || itemCat === 'burgers' || itemCat === 'برجر' || itemCat === 'برجر بجمدان')) ||
                 (targetCat === 'pizza' && (itemCat === 'pizzas' || itemCat === 'pizza' || itemCat === 'بيتزا' || itemCat === 'بيتزا حكاية')) ||
                 (targetCat === 'dessert' && (itemCat === 'desserts' || itemCat === 'dessert' || itemCat === 'حلويات' || itemCat === 'حلويات وفرفشة' || itemCat === 'حلو' || itemCat === 'تحلية')) ||
                 (targetCat === 'salads' && (itemCat === 'salad' || itemCat === 'salads' || itemCat === 'سلطة' || itemCat === 'salds' || itemCat === 'سلطات' || itemCat === 'سلطات فريش')) ||
                 (targetCat === 'sushi' && (itemCat === 'sushi' || itemCat === 'سوشي' || itemCat === 'سوشي دلع')) ||
                 (targetCat === 'ramen' && (itemCat === 'ramen' || itemCat === 'رامين' || itemCat === 'رامين ياباني')) ||
                 (targetCat === 'drinks' && (itemCat === 'drink' || itemCat === 'drinks' || itemCat === 'مشروبات' || itemCat === 'مشروبات منعشة' || itemCat === 'مشروب')) ||
                 (targetCat === 'sides' && (itemCat === 'side' || itemCat === 'sides' || itemCat === 'مقبلات' || itemCat === 'مقبلات جانبية' || itemCat === 'اطباق جانبية'));
        });
        
        matchesCategory = !!(hasMatchingRestCategory || hasMatchingMenuItem);
      }
    }

    // 2. Search query matches name, categories, description, or individual dishes
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesRestName = rest.name.toLowerCase().includes(query) || 
                            rest.descriptionString?.toLowerCase().includes(query) ||
                            rest.categories.some(cat => cat.toLowerCase().includes(query));

    const matchesMenuItems = rest.menu?.some(
      (item) => item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
    );

    return matchesCategory && (matchesRestName || matchesMenuItems);
  });

  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Compile matching dishes across the eligible restaurants as per search query
  const matchingDishes: { item: MenuItem; restaurant: Restaurant }[] = [];
  const query = searchQuery.toLowerCase().trim();
  if (query) {
    restaurants.forEach((rest) => {
      let matchesCategory = true;
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'offers') {
          matchesCategory = !!rest.promo;
        } else {
          const targetCat = selectedCategory.toLowerCase().trim();
          const hasMatchingRestCategory = rest.categories && rest.categories.some(c => c.toLowerCase().trim() === targetCat);
          const hasMatchingMenuItem = rest.menu && rest.menu.some(item => {
            const itemCat = (item.category || '').toLowerCase().trim();
            return itemCat === targetCat ||
                   (targetCat === 'burgers' && (itemCat === 'burger' || itemCat === 'burgers' || itemCat === 'برجر' || itemCat === 'برجر بجمدان')) ||
                   (targetCat === 'pizza' && (itemCat === 'pizzas' || itemCat === 'pizza' || itemCat === 'بيتزا' || itemCat === 'بيتزا حكاية')) ||
                   (targetCat === 'dessert' && (itemCat === 'desserts' || itemCat === 'dessert' || itemCat === 'حلويات' || itemCat === 'حلويات وفرفشة' || itemCat === 'حلو' || itemCat === 'تحلية')) ||
                   (targetCat === 'salads' && (itemCat === 'salad' || itemCat === 'salads' || itemCat === 'سلطة' || itemCat === 'salds' || itemCat === 'سلطات' || itemCat === 'سلطات فريش')) ||
                   (targetCat === 'sushi' && (itemCat === 'sushi' || itemCat === 'سوشي' || itemCat === 'سوشي دلع')) ||
                   (targetCat === 'ramen' && (itemCat === 'ramen' || itemCat === 'رامين' || itemCat === 'رامين ياباني')) ||
                   (targetCat === 'drinks' && (itemCat === 'drink' || itemCat === 'drinks' || itemCat === 'مشروبات' || itemCat === 'مشروبات منعشة' || itemCat === 'مشروب')) ||
                   (targetCat === 'sides' && (itemCat === 'side' || itemCat === 'sides' || itemCat === 'مقبلات' || itemCat === 'مقبلات جانبية' || itemCat === 'اطباق جانبية'));
          });
          matchesCategory = !!(hasMatchingRestCategory || hasMatchingMenuItem);
        }
      }
      if (matchesCategory && rest.menu) {
        rest.menu.forEach((item) => {
          const matchesName = item.name.toLowerCase().includes(query) || 
                              (item.description && item.description.toLowerCase().includes(query)) ||
                              (item.category && item.category.toLowerCase().includes(query));
          if (matchesName) {
            matchingDishes.push({ item, restaurant: rest });
          }
        });
      }
    });
  }

  // Compile menu items matching selected category across all restaurants
  const categoryMatchingDishes: { item: MenuItem; restaurant: Restaurant }[] = [];
  if (selectedCategory !== 'all') {
    restaurants.forEach((rest) => {
      if (rest.menu && Array.isArray(rest.menu)) {
        rest.menu.forEach((item) => {
          const itemCat = (item.category || '').toLowerCase().trim();
          const targetCat = selectedCategory.toLowerCase().trim();
          
          let matches = false;
          if (targetCat === 'offers') {
            matches = itemCat === 'offers' || itemCat === 'special offers' || itemCat === 'عروض' || itemCat === 'عروض دمار' || itemCat === 'عرض' || (!!item.originalPrice && item.originalPrice > item.price);
          } else {
            matches = itemCat === targetCat ||
                      (targetCat === 'burgers' && (itemCat === 'burger' || itemCat === 'burgers' || itemCat === 'برجر' || itemCat === 'برجر بجمدان')) ||
                      (targetCat === 'pizza' && (itemCat === 'pizzas' || itemCat === 'pizza' || itemCat === 'بيتزا' || itemCat === 'بيتزا حكاية')) ||
                      (targetCat === 'dessert' && (itemCat === 'desserts' || itemCat === 'dessert' || itemCat === 'حلويات' || itemCat === 'حلويات وفرفشة' || itemCat === 'حلو' || itemCat === 'تحلية')) ||
                      (targetCat === 'salads' && (itemCat === 'salad' || itemCat === 'salads' || itemCat === 'سلطة' || itemCat === 'سلطات' || itemCat === 'سلطات فريش')) ||
                      (targetCat === 'sushi' && (itemCat === 'sushi' || itemCat === 'سوشي' || itemCat === 'سوشي دلع')) ||
                      (targetCat === 'ramen' && (itemCat === 'ramen' || itemCat === 'رامين' || itemCat === 'رامين ياباني')) ||
                      (targetCat === 'drinks' && (itemCat === 'drink' || itemCat === 'drinks' || itemCat === 'مشروبات' || itemCat === 'مشروب'));
          }

          if (matches) {
            categoryMatchingDishes.push({ item, restaurant: rest });
          }
        });
      }
    });
  }

  const getCategoryIcon = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (catId === 'offers') return '🏷️';
    if (catId === 'drinks') return '🥤';
    if (catId === 'sides') return '🍟';
    return cat ? cat.icon : '🍽️';
  };

  const getCategoryArLabel = (catId: string) => {
    const map: Record<string, string> = {
      all: 'كل الأكلات',
      burgers: 'برجر بجمدان',
      pizza: 'بيتزا حكاية',
      salads: 'سلطات فريش',
      sushi: 'سوشي دلع',
      ramen: 'رامين ياباني',
      dessert: 'حلويات وفرفشة',
      drinks: 'مشروبات منعشة',
      sides: 'مقبلات جانبية',
      offers: 'عروض دمار'
    };
    return map[catId] || catId;
  };

  // Helper to repeat restaurants for infinite circular scroll
  const getRepeatedRestaurants = () => {
    if (filteredRestaurants.length === 0) return [];
    if (filteredRestaurants.length === 1) return filteredRestaurants;
    return [...filteredRestaurants, ...filteredRestaurants, ...filteredRestaurants];
  };

  // Helper to compile most ordered dishes dynamically based on real customer orders
  const getMostOrderedDishes = () => {
    // 1. Accumulate item counts from all guest orders in state
    const counts: Record<string, number> = {};
    orders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((cItem) => {
          if (cItem.menuItem && cItem.menuItem.id) {
            counts[cItem.menuItem.id] = (counts[cItem.menuItem.id] || 0) + (cItem.quantity || 1);
          }
        });
      }
    });

    // 2. Map all available menu items with their parent restaurants
    const allDishesMap: Record<string, { item: MenuItem; restaurant: Restaurant }> = {};
    restaurants.forEach((rest) => {
      if (rest.menu && Array.isArray(rest.menu)) {
        rest.menu.forEach((item) => {
          allDishesMap[item.id] = { item, restaurant: rest };
        });
      }
    });

    // 3. Keep items that exist in our active restaurant menus and sort by order counts descending
    const orderedDishesSorted = Object.keys(counts)
      .filter((itemId) => allDishesMap[itemId])
      .map((itemId) => ({
        ...allDishesMap[itemId],
        orderCount: counts[itemId],
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    // 4. Return top 6 dynamic items. If we have fewer than 3 ordered items, fall back to default logic so the section is never empty.
    if (orderedDishesSorted.length >= 3) {
      return orderedDishesSorted.map(d => ({ item: d.item, restaurant: d.restaurant })).slice(0, 6);
    }

    // Default static fallback when no/very few orders are in system
    const fallbackDishes: { item: MenuItem; restaurant: Restaurant }[] = [];
    restaurants.forEach((rest) => {
      if (rest.menu && Array.isArray(rest.menu)) {
        const populars = rest.menu.filter(m => m.category === 'Popular');
        const itemsToTake = populars.length > 0 ? populars : rest.menu.slice(0, 2);
        itemsToTake.forEach((item) => {
          if (fallbackDishes.length < 6) {
            fallbackDishes.push({ item, restaurant: rest });
          }
        });
      }
    });
    return fallbackDishes.slice(0, 6);
  };

  // Centering scroll position on list update to allow infinite left/right scroll
  useEffect(() => {
    if (!loadingRestaurants && filteredRestaurants.length > 1 && restaurantRowRef.current) {
      const container = restaurantRowRef.current;
      setTimeout(() => {
        container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
      }, 100);
    }
  }, [filteredRestaurants, loadingRestaurants]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-[#f94c10]/25 selection:text-[#f94c10]">
      
      {/* Absolute floating notifications */}
      {copiedPromoToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700/50 text-white text-xs font-semibold py-3.5 px-6 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="bg-[#f94c10] text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>
          <span>
            {`تم نسخ الكود "${copiedPromoToast}". حطه في الحساب عشان تاخد الخصم يا معلم!`}
          </span>
        </div>
      )}

      {/* Header component */}
      <Header
        currentAddress={address}
        setAddress={setAddress}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartCount={cartItemsCount}
        onCartClick={() => setIsCartOpen(true)}
        activeOrders={currentUser ? orders.filter(o => o.customerPhone === currentUser.phone) : []}
        onOrderClick={(ord) => {
          setSelectedOrder(ord);
          setActiveView('tracker');
        }}
        activeView={activeView}
        setActiveView={setActiveView}
        currentUser={currentUser}
        onAuthClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}
        onLogout={handleLogout}
        logoImage={settings.logoImage}
      />

      {/* Main router viewport */}
      <main className="flex-1 pb-16">
        {activeView === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Manager banner removed as requested */}
            
            {/* Category Carousel Row */}
            <CategoryList 
              selectedCategory={selectedCategory} 
              onSelectCategory={handleSelectCategory} 
              categories={settings.categories}
            />

            {/* Twin Promo Boxes */}
            <PromoBanners 
              onPromoCopy={handlePromoCopyNotification} 
            />

            {/* Popular Restaurants / Search By Dish Section */}
            <section className="px-4 md:px-8 mt-6">
              <div className="max-w-7xl mx-auto">
                {searchQuery ? (
                  // Search By Item/Dish Grid instead of listing restaurants
                  <div className="space-y-6">
                    <div className={`flex items-center justify-between border-b border-slate-100 pb-3 ${'flex-row-reverse'}`}>
                      <h2 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight font-display">
                        {`نتائج البحث عن الاصناف: "${searchQuery}" (${matchingDishes.length})`}
                      </h2>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="text-xs font-bold text-slate-500 hover:text-orange-550 transition-colors cursor-pointer"
                      >
                        {'إلغاء البحث ✕'}
                      </button>
                    </div>

                    {matchingDishes.length === 0 ? (
                      <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl p-8 space-y-4">
                        <p className="text-slate-400 font-bold text-sm">
                          'لم نجد أي صنف أو طبق بهذا الاسم. جرب أكلات تانية يا غالي! 🍕'
                        </p>
                        <button 
                          onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                          className="bg-[#f94c10] hover:bg-[#e03d08] text-white rounded-full py-2 px-6 text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          {t('resetSearch')}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matchingDishes.map(({ item, restaurant }) => {
                          const isOffer = !!(restaurant.promo || item.originalPrice);
                          return (
                            <div 
                              key={item.id} 
                              className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col justify-between hover:shadow-xl hover:border-orange-500/10 transition-all duration-300 relative group"
                            >
                              {isOffer && (
                                <div className="absolute top-3 right-3 bg-red-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full z-10 shadow-sm uppercase shrink-0">
                                  {'خصم فعال 🔥'}
                                </div>
                              )}
                              
                              <div className="space-y-3">
                                <div className="aspect-[4/3] w-full rounded-2xl bg-slate-50 overflow-hidden relative border border-slate-100/50">
                                  <img 
                                    src={item.image || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80`} 
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                </div>

                                <div className="space-y-1" style={{ textAlign: 'right' }}>
                                  <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-orange-550 transition-colors">
                                      {item.name}
                                    </h3>
                                    <span className="text-xs font-black text-[#f94c10] shrink-0">
                                      {item.price} {t('egp')}
                                    </span>
                                  </div>
                                  
                                  {item.description && (
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">
                                      {item.description}
                                    </p>
                                  )}

                                  {/* Link to visit the originating restaurant layout */}
                                  <button
                                    onClick={() => handleOpenRestaurant(restaurant)}
                                    className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-550 font-extrabold cursor-pointer transition-colors bg-slate-50 hover:bg-orange-50/50 py-1.5 px-3 rounded-xl w-full"
                                  >
                                    <span className="text-sm">🏬</span>
                                    <span>
                                      {`من مطعم: ${restaurant.name} (اضغط للذهاب)`}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              <button
                                onClick={() => handleAddToCart(item, restaurant)}
                                className="w-full bg-[#f94c10] hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl mt-4 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                              >
                                <span>{'أضف للسلة 🛒'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {selectedCategory !== 'all' ? (
                      /* Category Dishes Section - Show dishes list */
                      <div className="space-y-6">
                        <div className={`flex items-center justify-between border-b border-rose-100 pb-3 ${'flex-row-reverse'}`}>
                          <div className={`flex items-center gap-3 ${'flex-row-reverse'}`}>
                            <span className="text-3xl p-2 bg-rose-50 rounded-2xl shrink-0">
                              {getCategoryIcon(selectedCategory)}
                            </span>
                            <div>
                              <h2 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight font-display">
                                {`أشهى وجبات: ${getCategoryArLabel(selectedCategory)}`}
                              </h2>
                              <p className="text-[11px] text-slate-400 font-bold">
                                {`تصفح ألذ الأكلات المتوفرة في فئة ${getCategoryArLabel(selectedCategory)} من مختلف المطاعم`}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setSelectedCategory('all')}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs py-1.5 px-4 rounded-full transition-all cursor-pointer hover:scale-102 shrink-0"
                          >
                            {'عرض كل المطاعم 🏬'}
                          </button>
                        </div>

                        {categoryMatchingDishes.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-3">
                            <span className="text-4xl block">🥗🔍</span>
                            <p className="text-sm font-bold text-slate-500">
                              {'عفواً، لا توجد وجبات نشطة في هذا القسم حالياً.'}
                            </p>
                            <button
                              onClick={() => setSelectedCategory('all')}
                              className="text-[#f94c10] hover:underline font-black text-xs cursor-pointer"
                            >
                              {'البدء بالتصفح من جديد ↺'}
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {categoryMatchingDishes.map(({ item, restaurant }) => {
                              const isRestOpen = isRestaurantOpen(restaurant.openTime, restaurant.closeTime);
                              const originalPrice = item.originalPrice;
                              const isOffer = !!(originalPrice && originalPrice > item.price);
                              const translatedName = DISH_NAMES_MAP[item.name] || item.name;

                              return (
                                <div 
                                  key={`${restaurant.id}-${item.id || item.name}`}
                                  className="group bg-white border border-slate-100 hover:border-orange-100 rounded-[24px] p-4 transition-all duration-300 hover:shadow-xl flex flex-col justify-between relative"
                                >
                                  {isOffer && (
                                    <div className="absolute top-3 right-3 bg-red-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full z-10 shadow-sm uppercase shrink-0">
                                      {'عرض خاص 🎁'}
                                    </div>
                                  )}
                                  
                                  <div className="space-y-3">
                                    <div className="aspect-[4/3] w-full rounded-2xl bg-slate-50 overflow-hidden relative border border-slate-100/50">
                                      <img 
                                        src={item.image || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80`} 
                                        alt={item.name}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                      />
                                      {!isRestOpen && (
                                        <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center text-center p-2 z-10">
                                          <span className="text-white font-black text-[10px] bg-red-600 px-2 py-0.5 rounded-full">
                                            {'مغلق حالياً 🚪'}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-1" style={{ textAlign: 'right' }}>
                                      <div className="flex justify-between items-start gap-2">
                                        <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-orange-550 transition-colors">
                                          {translatedName}
                                        </h3>
                                        <span className="text-xs font-black text-[#f94c10] shrink-0">
                                          {item.price} {t('egp')}
                                        </span>
                                      </div>
                                      
                                      {item.description && (
                                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">
                                          {item.description}
                                        </p>
                                      )}

                                      <button
                                        onClick={() => handleOpenRestaurant(restaurant)}
                                        className="mt-2 text-right flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-[#f94c10] font-extrabold cursor-pointer transition-colors bg-slate-50 hover:bg-orange-50/50 py-1.5 px-3 rounded-xl w-full"
                                      >
                                        <span className="text-xs">🏬</span>
                                        <span className="line-clamp-1">
                                          {`${restaurant.name} (اضغط للذهاب)`}
                                        </span>
                                      </button>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (!isRestOpen) {
                                        alert('هذا المطعم مغلق حالياً');
                                        return;
                                      }
                                      handleAddToCart(item, restaurant);
                                    }}
                                    disabled={!isRestOpen}
                                    className={`w-full text-white font-extrabold text-xs py-2.5 px-4 rounded-xl mt-4 flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                                      isRestOpen 
                                        ? "bg-[#f94c10] hover:bg-orange-600 active:scale-95 cursor-pointer" 
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    }`}
                                  >
                                    <span>
                                      {isRestOpen 
                                        ? ('طلب فوري 🛒') 
                                        : ('مغلق حالياً 🔒')}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Traditional Restaurant list slider replaced with beautiful horizontal scroll */
                      <>
                        <div className={`flex items-center justify-between mb-4 ${'flex-row-reverse'}`}>
                          <h2 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight font-display">
                            {selectedCategory === 'all' 
                              ? t('popularRestaurants') 
                              : `مطاعم فئة الـ "${selectedCategory === 'offers' ? 'عروض ممتازة' : selectedCategory}" المتوفرة`
                            }
                          </h2>
                          
                          {/* Fully operational horizontal scroll controller */}
                          {(() => {
                            const handleScroll = (dir: 'left' | 'right') => {
                              const container = restaurantRowRef.current;
                              if (container) {
                                const offset = dir === 'left' ? -380 : 380;
                                container.scrollBy({ left: offset, behavior: 'smooth' });
                              }
                            };
                            return (
                              <div className="flex gap-1.5" style={{ direction: 'ltr' }}>
                                <button 
                                  onClick={() => handleScroll('left')}
                                  className="h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleScroll('right')}
                                  className="h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })()}
                        </div>

                        {loadingRestaurants ? (
                          <div className="text-center py-20 flex flex-col items-center justify-center gap-3">
                            <span className="animate-spin rounded-full h-8 w-8 border-4 border-[#f94c10] border-t-transparent" />
                            <p className="text-xs font-bold text-slate-500">{'جاري شحن المطاعم والأجهزة...'}</p>
                          </div>
                        ) : filteredRestaurants.length === 0 ? (
                          <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-8 space-y-3" style={{ textAlign: 'center' }}>
                            <p className="text-slate-400 font-bold text-sm">{t('noRestaurantsFound')}</p>
                            <button 
                              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                              className="bg-[#f94c10] hover:bg-[#e03d08] text-white rounded-full py-2 px-5 text-xs font-bold transition-all cursor-pointer shadow-sm"
                            >
                              {t('resetSearch')}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div 
                              ref={restaurantRowRef}
                              onScroll={(e) => {
                                const container = e.currentTarget;
                                if (!container || filteredRestaurants.length <= 1) return;
                                const singleSetWidth = container.scrollWidth / 3;
                                const centerPosition = (container.scrollWidth - container.clientWidth) / 2;
                                const scrolledFromCenter = container.scrollLeft - centerPosition;
                                
                                if (Math.abs(scrolledFromCenter) >= singleSetWidth) {
                                  const jumpCount = Math.round(scrolledFromCenter / singleSetWidth);
                                  container.scrollLeft = container.scrollLeft - (jumpCount * singleSetWidth);
                                }
                              }}
                              className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-1 snap-x no-scrollbar select-none"
                              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                            >
                              {getRepeatedRestaurants().map((restaurant, idx) => (
                                <div 
                                  key={`${restaurant.id}_repeat_${idx}`} 
                                  className="w-[82vw] sm:w-[325px] md:w-[365px] lg:w-[390px] shrink-0 snap-center pb-2"
                                >
                                  <RestaurantCard
                                    restaurant={restaurant}
                                    onClick={() => handleOpenRestaurant(restaurant)}
                                    reviews={reviews}
                                  />
                                </div>
                              ))}
                            </div>

                            {/* قائمة بأسماء المطاعم المسجلة المتوفرة */}
                            <div className="mt-8 border-t border-slate-100 pt-6">
                              <h3 
                                id="restaurant-list-directory"
                                className="text-sm font-black text-slate-700 mb-4 flex items-center gap-1.5" 
                                style={{ textAlign: 'right', direction: 'rtl' }}
                              >
                                <span>🏬</span>
                                <span>{'قائمة المتاجر والمطاعم المسجلة المتوفرة حالياً'}</span>
                              </h3>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3" style={{ direction: 'rtl' }}>
                                {restaurants.map((rest) => {
                                  const isRestOpen = isRestaurantOpen(rest.openTime, rest.closeTime);
                                  const displayRestName = RESTAURANT_NAMES_MAP[rest.name] || rest.name;
                                  return (
                                    <button
                                      key={`dir-${rest.id}`}
                                      id={`btn-dir-store-${rest.id}`}
                                      onClick={() => handleOpenRestaurant(rest)}
                                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-100 hover:border-orange-200 hover:shadow-xs transition-all text-center cursor-pointer group"
                                    >
                                      <span className="text-xl mb-1.5 group-hover:scale-110 transition-transform">
                                        {rest.name.includes('Burger') ? '🍔' : rest.name.includes('Pizza') ? '🍕' : '🏪'}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[#f94c10] transition-colors">
                                        {displayRestName}
                                      </span>
                                      <span className={`text-[9px] font-black mt-1 px-1.5 py-0.5 rounded-full ${
                                        isRestOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                      }`}>
                                        {isRestOpen ? ('مفتوح 🟢') : ('مغلق 🔴')}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </section>

            {selectedCategory === 'all' && !searchQuery && (
              <BestSellersAndReviews
                bestSellers={bestSellers}
                reviews={reviews}
                onAddToCart={handleAddToCart}
                onOpenRestaurant={handleOpenRestaurant}
              />
            )}
          </div>
        )}

        {activeView === 'restaurant' && selectedRestaurant && (
          <RestaurantDetail
            restaurant={restaurants.find(r => r.id === selectedRestaurant.id) || selectedRestaurant}
            onBack={goBack}
            cart={cart}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            onRefreshData={loadInitialData}
            reviews={reviews}
          />
        )}

        {activeView === 'tracker' && selectedOrder && (
          <OrderTracker
            order={selectedOrder}
            onBack={goBack}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

        {activeView === 'admin' && (
          <AdminPage 
            restaurants={restaurants}
            onBack={goBack}
            onRefreshData={loadInitialData} 
            onAdminLogin={handleAdminAuthSuccess}
            onAdminLogout={handleLogout}
            reviews={reviews}
            onNavigateCaptain={() => navigateTo('captain')}
          />
        )}

        {activeView === 'captain' && (
          (() => {
            // ✅ بس الأدمن أو الكابتن اللي الأدمن وافق عليه يدخل
            const canAccessCaptain = currentUser && (
              currentUser.role === 'admin' ||
              currentUser.role === 'primary' ||
              (currentUser.role === 'captain' && (currentUser as any).status === 'approved')
            );
            if (!canAccessCaptain) {
              return (
                <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
                  <span className="text-5xl">🔒</span>
                  <h2 className="text-xl font-black text-slate-800">الوصول مقيد</h2>
                  <p className="text-sm text-slate-500">صفحة الكابتن متاحة فقط للكباتنة المعتمدين من الإدارة.</p>
                  <button onClick={goBack} className="px-6 py-2 bg-[#f94c10] text-white rounded-2xl font-bold text-sm">رجوع</button>
                </div>
              );
            }
            return (
          <CaptainPage
            currentUser={
              currentUser
                ? {
                    id: currentUser.id,
                    name: currentUser.role === 'primary' || currentUser.role === 'admin' ? `${currentUser.name} (آدمن)` : currentUser.name,
                    email: currentUser.email,
                    phone: currentUser.phone || '01016789012',
                    role: 'captain'
                  }
                : { id: 'temp_cap', name: 'كابتن مسافر التجريبي 🛵', email: 'captain@mutafer.com', phone: '01012345678', role: 'captain' }
            }
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
            onBack={goBack}
            onLogout={handleLogout}
            onRefreshData={loadInitialData}
            reviews={reviews}
          />
            );
          })()
        )}

        {activeView === 'my-orders' && (
          <MyOrdersPage
            orders={orders}
            currentUser={currentUser}
            onOrderClick={(ord) => {
              setSelectedOrder(ord);
              setActiveView('tracker');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onBack={goBack}
            reviews={reviews}
            onNavigateCaptain={() => navigateTo('captain')}
          />
        )}

        {activeView === 'about' && (
          <div className="max-w-3xl mx-auto px-4 py-12 animate-in fade-in duration-200" style={{ direction: 'rtl' }}>
            <div className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-12 shadow-xl space-y-8 relative overflow-hidden">
               {/* Elegant visual brand logo */}
               <div className="flex flex-col items-center text-center space-y-4">
                 <Logo size="lg" src={settings.logoImage} />
                 <div>
                   <h1 className="font-display font-extrabold text-2xl md:text-3xl text-slate-800">
                     {'تطبيق متوفر إيتس'}
                   </h1>
                   <p className="text-xs font-bold text-[#f94c10] uppercase tracking-widest mt-1">
                     {'سرعة التوصيل • متعة الطعام'}
                   </p>
                 </div>
               </div>

               {/* Mission details */}
               <div className="prose prose-slate max-w-none text-slate-650 text-sm md:text-base leading-relaxed text-center space-y-6">
                 <p className="font-medium whitespace-pre-wrap">
                   {settings.aboutUsContent || ('تطبيق مسافر هو المنصة الرائدة لتوصيل الطعام الفاخر والوجبات الطازجة بأقصى سرعة واحترافية.')}
                 </p>
               </div>

               {/* Small Stats Grid */}
               <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-8 text-center">
                 <div className="space-y-1">
                   <p className="text-xl md:text-2xl font-black text-[#f94c10]">١٠٠٪</p>
                   <p className="text-[10px] md:text-xs text-slate-400 font-bold">{'كباتن معتمدين'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-xl md:text-2xl font-black text-[#f94c10]">١٥-٢٥</p>
                   <p className="text-[10px] md:text-xs text-slate-400 font-bold">{'دقيقة توصيل'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-xl md:text-2xl font-black text-[#f94c10]">٢٤/٧</p>
                   <p className="text-[10px] md:text-xs text-slate-400 font-bold">{'خدمة متميزة'}</p>
                 </div>
               </div>

               {/* Back Button */}
               <div className="flex justify-center pt-4">
                 <button
                   onClick={() => setActiveView('home')}
                   className="bg-[#f94c10] hover:bg-[#e03d08] text-white font-extrabold text-xs py-3 px-8 rounded-full transition-all shadow-md cursor-pointer hover:scale-102"
                 >
                   {'الرجوع للرئيسية 🗺️'}
                 </button>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Cart Sidebar slide-over drawer */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onAddToCart={(itm, rest, size) => handleAddToCart(itm, rest, size)}
        onRemoveFromCart={handleRemoveFromCart}
        onCheckout={handleInitiateCheckout}
        coupons={settings.coupons}
      />

      {/* Checkout Modal step-form */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          subtotal={cart.reduce((tot, item) => tot + item.menuItem.price * item.quantity, 0)}
          discount={0} 
          deliveryOptions={settings.deliveryOptions}
          currentAddress={address}
          onPlaceOrder={handleFinalizeOrder}
          currentUser={currentUser}
          settings={settings}
          restaurant={restaurants.find(r => r.id === cart[0]?.restaurantId)}
        />
      )}

      {/* Account Registration/Login Modal */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          initialMode={authMode}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Persistent mini-floating Cart button when scroll is deep and cart has items */}
      {cartItemsCount > 0 && !isCartOpen && !isCheckoutOpen && activeView !== 'tracker' && (
        <button
          onClick={() => setIsCartOpen(true)}
          className={`fixed bottom-6 ${'left-6'} z-30 bg-[#f94c10] hover:bg-[#e03d08] text-white py-3.5 px-5 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer font-display font-black text-xs sm:text-sm`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span>{`سلة الأكل (${cartItemsCount})`}</span>
        </button>
      )}
    </div>
  );
}
