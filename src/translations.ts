// قاموس التطبيق العربي فقط. تم تعطيل تبديل اللغة مؤقتًا لحين إضافة الإنجليزية لاحقًا.
export type Language = 'ar';
export let lang: Language = 'ar';
export function setLang(_l: Language = 'ar') { lang = 'ar'; }

export const TRANSLATIONS = {
  ar: {
    // Header & Navigation
    appName: "مسافر إيتس 🛵",
    slogan: "بنوصلك السعادة لحد باب بيتك",
    searchPlaceholder: "جعان؟ دور على أكل، مطعم، أو تحلية...",
    addressLabel: "عنوان الدليفري",
    checkoutBasket: "حساب الكرش والسلة",
    ordersCount: "الطلبات الشغالة",
    toggleLanguage: "العربية 🇪🇬",
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

export function getTranslation(key: keyof typeof TRANSLATIONS.ar, _lang: Language = 'ar', params?: Record<string, string | number>): string {
  let text = TRANSLATIONS.ar[key] || String(key);
  if (params) {
    Object.entries(params).forEach(([p, value]) => { text = text.replaceAll(`{${p}}`, String(value)); });
  }
  return text;
}
