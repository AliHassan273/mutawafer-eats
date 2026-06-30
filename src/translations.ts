// Translation dictionary for Mutafer Eats localization into Egyptian Arabic
export type Language = 'en' | 'ar';

// Runtime language switcher (default to Arabic). Persisted in localStorage when available.
let _initialLang: Language = 'ar';
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('mutafer_lang');
  if (saved === 'en' || saved === 'ar') _initialLang = saved as Language;
}

export let lang: Language = _initialLang;

export function setLang(l: Language) {
  lang = l;
  if (typeof window !== 'undefined') localStorage.setItem('mutafer_lang', l);
}

export const TRANSLATIONS = {
  en: {
    // Header & Navigation
    appName: "Mutafer Eats",
    slogan: "Delivering Happiness to Your Doorstep",
    searchPlaceholder: "Search foods, restaurants, items...",
    addressLabel: "Delivery Address",
    checkoutBasket: "Checkout Basket",
    ordersCount: "Active Orders",
    toggleLanguage: "عربي 🇪🇬",
    currentLocation: "Middle of Egypt",
    adminPanel: "Admin Panel",
    backToHome: "Back to Home",
    allEats: "All Eats",

    // General UI labels
    deliveryTime: "Delivery Time",
    deliveryFee: "Delivery Fee",
    freeDelivery: "Free Delivery",
    rating: "Rating",
    distance: "Distance",
    min: "min",
    km: "km",
    egp: "EGP",
    popularRestaurants: "Popular Restaurants Nearby",
    resetSearch: "Reset search criteria",
    noRestaurantsFound: "We couldn't find any restaurants matching your search terms.",
    copiedPromo: "Promo code copied! Use it in checkout.",

    // Cart Sidebar
    cartTitle: "Your Shopping Bag",
    emptyCart: "Your bag is empty. Let's add some delicious eats!",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total",
    checkoutButton: "Proceed to Checkout",
    addMoreItems: "Hungry for more? Add items!",
    onlySingleRestaurant: "To maintain fresh delivery, you can only order from a single restaurant at a time. Do you want to clear your current bag?",
    clearCart: "Clear Bag",

    // Checkout Modal
    checkoutHeader: "Complete Your Order",
    customerName: "Full Name",
    customerPhone: "Phone Number",
    deliveryNotes: "Special Delivery Notes (e.g. Leave at door)",
    paymentMethod: "Payment Method",
    cashOnDelivery: "Cash on Delivery",
    creditCard: "Credit Card",
    placeOrder: "Place Order 🚀",
    cancel: "Cancel",
    promoCodeLabel: "Have a Promo Code?",
    applyPromo: "Apply",
    promoSuccess: "Promo applied! Saving EGP {amount}!",
    invalidPromo: "Invalid promo code.",

    // Order Tracker
    orderStatusTitle: "Live Order Tracker",
    statusReceived: "Order Received",
    statusPreparing: "Preparing Food",
    statusOutForDelivery: "Out for Delivery",
    statusDelivered: "Delivered & Enjoyed",
    receivedDesc: "We've received your order. The kitchen is booting up!",
    preparingDesc: "The chef is crafting your meal with premium ingredients.",
    deliveryDesc: "Our fast courier is flying to your location.",
    deliveredDesc: "Order arrived! Bon Appétit!",
    eta: "Estimated Arrival",
    minsRemaining: "minutes remaining",
    orderDetailsSummary: "Order Summary",
    trackId: "Track ID",

    // Special categories
    offers: "Special Offers",
    offersBadge: "SPECIAL DEAL",

    // Admin Panel
    adminTitle: "Mutafer Eats Admin Terminal",
    adminDesc: "Manage restaurants, menus, and utilize Gemini AI to parse and import menu items from files and images.",
    addRestaurant: "Add New Restaurant",
    editRestaurant: "Edit Restaurant",
    deleteRestaurant: "Delete Restaurant",
    restaurantName: "Restaurant Name",
    coverImageUrl: "Cover Image URL",
    categoryTags: "Category Tags (comma separated)",
    promoText: "Promo Text (optional)",
    statusSaved: "Changes saved successfully!",
    statusDeleted: "Restaurant deleted!",
    uploadMenuPrompt: "AI Menu Scanner (Images & Files)",
    uploadMenuDesc: "Upload an image of a physical menu, screenshot, or a file (text, CSV) to analyze and automatically extract menu items with names, descriptions, prices, and categories.",
    selectFile: "Choose File",
    analyzeLoading: "Gemini is examining your file...",
    approveImport: "Import Selected Items",
    analysisResults: "AI Extracted Dishes",
    noFileSelected: "Please select a menu image or document first",
    dragDropFile: "Drag & drop menu image/document here or click to select",
    restaurantSelect: "Select Restaurant to Add Items to",
    priceHelp: "Prices will be converted to numeric values.",
    addedSuccess: "Successfully added extracted menu items!"
  },
  ar: {
    // Header & Navigation
    appName: "مسافر إيتس 🛵",
    slogan: "بنوصلك السعادة لحد باب بيتك",
    searchPlaceholder: "جعان؟ دور على أكل، مطعم، أو تحلية...",
    addressLabel: "عنوان الدليفري",
    checkoutBasket: "حساب الكرش والسلة",
    ordersCount: "الطلبات الشغالة",
    toggleLanguage: "English 🇬🇧",
    currentLocation: "جمهورية مصر العربية 🇪🇬",
    adminPanel: "لوحة تحكم المعلم",
    backToHome: "رجوع للرئيسية",
    allEats: "كل الأكلات 🍽️",

    // General UI labels
    deliveryTime: "وقت التوصيل",
    deliveryFee: "تمن الدليفري",
    freeDelivery: "توصيل ببلاش 🎁",
    rating: "التقييم",
    distance: "المسافة",
    min: "دقيقة",
    km: "كم",
    egp: "جنيه",
    popularRestaurants: "مطاعم جامدة حواليك يلا بينا 😋",
    resetSearch: "إمسح التصفية والبحث",
    noRestaurantsFound: "ملقناش مطاعم مطابقة للبحث بتاعك. جرب حاجة تانية!",
    copiedPromo: "تم نسخ كود الدلع! استخدمه في الدفع لتوفير فلوسك.",

    // Cart Sidebar
    cartTitle: "سلة الأكل بتاعتك 🛒",
    emptyCart: "السلة فاضية خالص! يلا دلع كرشك واملأها بالأكل اللذيذ.",
    subtotal: "الحساب المبدئي",
    discount: "خصم الدلع",
    total: "الحساب كله",
    checkoutButton: "إحسب الحساب وإنجز 🚀",
    addMoreItems: "لسه جعان؟ ضيف أطباق تانية!",
    onlySingleRestaurant: "علشان الأكل يوصلك سخن وطازة، تقدر تطلب من مطعم واحد بس في المرة. نمسح السلة الحالية ونبدأ من جديد؟",
    clearCart: "إمسح السلة واستعد",

    // Checkout Modal
    checkoutHeader: "خلاص الأكل على وصول! كمل بياناتك",
    customerName: "اسمك بالكامل",
    customerPhone: "رقم موبايلك (عشان الطيار يكلمك)",
    deliveryNotes: "علامات مميزة للعنوان (مثلاً: رن جرس شقة ٥)",
    paymentMethod: "طريقة الدفع",
    cashOnDelivery: "كاش كود عند الاستلام",
    creditCard: "فيزا / كارت بنكي",
    placeOrder: "إبعت الطلب للمطبخ فوراً 🚀",
    cancel: "إلغاء",
    promoCodeLabel: "معاك كود خصم دلع؟",
    applyPromo: "شغل الخصم",
    promoSuccess: "الخصم اشتغل! وفرت {amount} جنيه يا معلم!",
    invalidPromo: "كود الخصم ده منتهي الصلاحية أو غلط.",

    // Order Tracker
    orderStatusTitle: "رادار تتبع الطلب المباشر 📡",
    statusReceived: "استلمنا طلبك وهيظبطوه 👍",
    statusPreparing: "بيحضروا الأكل بكل حب 👨‍🍳",
    statusOutForDelivery: "الطيار طار وجايلك في السكة 🛵",
    statusDelivered: "ألف هنا وشفا على قلبك! 🥰",
    receivedDesc: "طلبك وصل للمطعم، والمطبخ بدأ يسخن دلوقتي حالا!",
    preparingDesc: "الشيف بيجهز طلبك بأعلى جودة وأنضف المكونات.",
    deliveryDesc: "الطيار بتاعنا طار بأكل سخن مولع وجايلك بأقصى سرعة.",
    deliveredDesc: "الأكل وصل بالسلامة! فك الحزام وادخل بالهنا والشفا.",
    eta: "الوقت المتوقع للوصول",
    minsRemaining: "دقائق متبقية",
    orderDetailsSummary: "ملخص طلبك المنور",
    trackId: "رقم التتبع",

    // Special categories
    offers: "عروض تفرتك الجوع 🏷️",
    offersBadge: "عرض جبار 🔥",

    // Admin Panel
    adminTitle: "لوحة تحكم إدارة مسافر إيتس 🛠️",
    adminDesc: "تعديل بيانات المطاعم، والأصناف، واستخدام الذكاء الاصطناعي (Gemini UI) لقراءة وقرصنة قوائم المأكولات من الصور مباشرة.",
    addRestaurant: "إضافة مطعم جديد",
    editRestaurant: "تعديل بيانات المطعم",
    deleteRestaurant: "حذف المطعم نهائياً",
    restaurantName: "اسم المطعم",
    coverImageUrl: "رابط صورة الغلاف",
    categoryTags: "فئات المطعم (مفصولة بفاصلة)",
    promoText: "العرض الترويجي للمطعم (اختياري)",
    statusSaved: "تم حفظ التعديلات بنجاح يا ريس!",
    statusDeleted: "تم مسح المطعم الله يرحمه!",
    uploadMenuPrompt: "قارئ المنيو بالذكاء الاصطناعي (AI Scanner) 📸",
    uploadMenuDesc: "ارفع صورة منيو ورقي، أو سكرين شوت، أو ملف نصي، وسيقوم الذكاء الاصطناعي باستخراج أسماء الأكلات، الوصف، والأسعار وتقسيمها لفئات في ثواني معدودة!",
    selectFile: "اختار المنيو أو الصورة",
    analyzeLoading: "جاري تشغيل الذكاء الاصطناعي وفحص المستند...",
    approveImport: "استيراد الأصناف المستخرجة إلى المطعم ✅",
    analysisResults: "الأطباق المستخرجة بالذكاء الاصطناعي",
    noFileSelected: "من فضلك أرفق صورة منيو أو مستند أولاً",
    dragDropFile: "اسحب وألقِ صورة المنيو/المستند هنا أو اضغط للاختيار",
    restaurantSelect: "اختار المطعم اللي هنضيفله الأصناف دي",
    priceHelp: "سيتم تحويل المبالغ تلقائياً لأسعار رقمية.",
    addedSuccess: "يا مسهل! تم إضافة جميع الأكلات المستخرجة بنجاح للمطعم!"
  }
};

export function getTranslation(key: keyof typeof TRANSLATIONS['en'], lang: Language, params?: Record<string, string | number>): string {
  let text = TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || String(key);
  if (params) {
    Object.keys(params).forEach((p) => {
      text = text.replace(`{${p}}`, String(params[p]));
    });
  }
  return text;
}
