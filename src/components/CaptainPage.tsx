import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Bike, User, Phone, CheckCircle, Flame, DollarSign, LogOut, Check, ShieldAlert } from 'lucide-react';
import { Order, CartItem, Review } from '../types';
import { lang, getTranslation } from '../translations';
import { fetchWithRetry } from '../utils/fetchHelper';

interface CaptainPageProps {
  currentUser: { id: string; name: string; email?: string; phone: string; role: string };
  orders: Order[];
  onUpdateStatus: (
    orderId: string,
    status: 'Pending' | 'Received' | 'Preparing' | 'OutForDelivery' | 'Delivered',
    courierName?: string,
    courierPhone?: string
  ) => void;
  onBack: () => void;
  onLogout: () => void;
  onRefreshData?: () => Promise<void>;
  reviews?: Review[];
}

export default function CaptainPage({

  currentUser,
  orders,
  onUpdateStatus,
  onBack,
  onLogout,
  onRefreshData,
  reviews,
}: CaptainPageProps) {
  const isAr = true;
  const t = (key: any, params?: any) => getTranslation(key, lang as any, params);

  const [successMsg, setSuccessMsg] = useState('');
  const [isSpawning, setIsSpawning] = useState(false);

  // Dynamic captain ratings
  const captainReviews = React.useMemo(() => {
    if (!reviews) return [];
    return reviews.filter(r => r.courierName === currentUser.name);
  }, [reviews, currentUser.name]);

  const avgSpeed = React.useMemo(() => {
    if (captainReviews.length === 0) return 5.0;
    const sum = captainReviews.reduce((acc, r) => acc + (r.ratingDeliverySpeed || 5), 0);
    return Number((sum / captainReviews.length).toFixed(1));
  }, [captainReviews]);

  const avgManner = React.useMemo(() => {
    if (captainReviews.length === 0) return 5.0;
    const sum = captainReviews.reduce((acc, r) => acc + (r.ratingDeliveryManner || 5), 0);
    return Number((sum / captainReviews.length).toFixed(1));
  }, [captainReviews]);

  // ============================================================
  // GPS AGREEMENT - إلزامي ولا يمكن تخطيه
  // ============================================================
  const [isGpsAgreed, setIsGpsAgreed] = useState(() => {
    return localStorage.getItem('mutafer_captain_gps_agreed') === 'true';
  });

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string>('');

  // تشغيل تتبع GPS إذا وافق المستخدم
  useEffect(() => {
    let watchId: number;

    if (isGpsAgreed) {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setGpsCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setGpsError('');
          },
          (err) => {
            console.log("GPS blocked:", err.message);
            setGpsError(isAr
              ? '⚠️ الـ GPS مقفول! افتح إعدادات المتصفح ← الخصوصية ← الموقع ← اسمح للموقع. لن تتمكن من استلام طلبات بدون GPS حقيقي.'
              : '⚠️ GPS is blocked! Open browser Settings → Privacy → Location → Allow. You cannot accept orders without real GPS.');
            setGpsCoords(null); // ✅ null = مش هيقدر يستلم طلبات
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        setGpsError(isAr
          ? '⚠️ متصفحك لا يدعم GPS. لا يمكن استلام طلبات.'
          : '⚠️ Your browser does not support GPS. Cannot accept orders.');
        setGpsCoords(null);
      }
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isGpsAgreed]);

  // ✅ Refresh الأوردرات كل 30 ثانية عشان الكابتن يشوف الطلبات الجديدة
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      onRefreshData();
    }, 30000);
    return () => clearInterval(refreshInterval);
  }, [onRefreshData]);

  // ✅ ابعت موقع الكابتن للسيرفر كل 15 ثانية
  useEffect(() => {
    if (!gpsCoords) return;
    const activeOrder = orders.find(o =>
      o.courierPhone === currentUser.phone && o.status === 'OutForDelivery'
    );
    const sendLocation = async () => {
      try {
        await fetchWithRetry('/api/captain/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: gpsCoords.lat,
            lng: gpsCoords.lng,
            orderId: activeOrder?.id,
          }),
        });
      } catch {}
    };
    sendLocation();
    const locInterval = setInterval(sendLocation, 15000);
    return () => clearInterval(locInterval);
  }, [gpsCoords, orders]);

  // ℹ️ الـ GPS الحقيقي بيشتغل من watchPosition أعلاه — مفيش محاكاة

  // ============================================================
  // إذا لم يوافق الكابتن على GPS، نعرض نافذة إلزامية ولا نعرض أي محتوى آخر
  // ============================================================
  if (!isGpsAgreed) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-100 text-slate-800 space-y-6">
          <div className="absolute -right-16 -top-16 opacity-5 text-[150px] pointer-events-none select-none">
            📡
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 bg-red-50 text-red-650 rounded-2xl flex items-center justify-center text-3xl animate-pulse">
              <ShieldAlert className="h-8 w-8 text-red-600 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                {isAr ? '⚠️ متطلب أمني أساسي وجوهري للعمل' : '⚠️ Core Operational GPS Requirement'}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-[#f94c10] uppercase tracking-wider mt-1">
                {isAr ? 'بروتوكول تتبع الكباتن مفعّل' : 'Captain Active Tracking Protocol'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs sm:text-xs leading-relaxed space-y-3 font-semibold text-slate-650">
            <p className="text-slate-800 font-extrabold text-center text-xs sm:text-sm border-b border-slate-200 pb-2">
              {isAr ? 'طلب أساسي وإلزامي من الإدارة والعملاء:' : 'Mandatory Request From Logistics Admin & Customers:'}
            </p>
            <div className="space-y-2.5">
              <div className="flex gap-2 items-start">
                <span className="text-sm shrink-0">📱</span>
                <p>{isAr ? 'إبقاء الشاشة مضيئة طوال فترة تسليم الطلب وعدم إغلاق الهاتف.' : 'Keep your screen backlight on and the app open during deliveries.'}</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-sm shrink-0">🛰️</span>
                <p>{isAr ? 'فتح وتشغيل الموقع الجغرافي الـ GPS بالمتصفح ليتم تتبع تحركاتك.' : 'Keep browser GPS and location permission fully enabled.'}</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-sm shrink-0">⚡</span>
                <p>{isAr ? 'تشغيل الموقع بالخلفية طوال الوقت لكي تحصل على الطلبات الجديدة تلقائياً.' : 'Let background location stream to receive nearby active orders.'}</p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-bold text-center">
            {isAr 
              ? 'مخالفة هذا المتطلب يؤدي لعدم احتساب التوصيلات ووقف إسناد الطلبات الجارية.'
              : 'Failure to strictly adhere to GPS requirements leads to delivery flow pauses.'}
          </p>

          <button
            onClick={() => {
              localStorage.setItem('mutafer_captain_gps_agreed', 'true');
              setIsGpsAgreed(true);
              // إعادة تحميل الصفحة لتحديث الحالة
              window.location.reload();
            }}
            className="w-full bg-[#f94c10] hover:bg-orange-600 text-white font-extrabold py-3.5 px-6 rounded-2xl text-xs sm:text-sm transition-all active:scale-98 shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="h-4.5 w-4.5" />
            <span>{isAr ? 'أوافق، وألتزم بتشغيل الموقع طوال الوقت 👍' : 'I agree and commit keeping location active 👍'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // باقي دوال CaptainPage (نفس الكود الأصلي)
  // ============================================================

  const handlePickUpOrder = (orderId: string) => {
    // ✅ GPS حقيقي إلزامي
    if (!gpsCoords) {
      alert(isAr
        ? '⚠️ يجب تفعيل الـ GPS الفعلي من إعدادات المتصفح أولاً قبل استلام الطلب!'
        : '⚠️ You must enable real GPS from browser settings before picking up an order!');
      return;
    }
    onUpdateStatus(orderId, 'OutForDelivery', currentUser.name, currentUser.phone);
    // ✅ refresh فوري عشان الطلب يتشال من القائمة
    setTimeout(() => onRefreshData(), 500);
    setSuccessMsg(isAr ? '🥳 تم استلام الطلب وبدأ الرحلة بنجاح! طير للعميل بالسلامة.' : 'Picked up order successfully! Take care on the road.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCompleteOrder = (orderId: string) => {
    // ✅ اشترط وجود GPS حقيقي قبل التسليم
    if (!gpsCoords) {
      alert(isAr
        ? '⚠️ يجب تفعيل الـ GPS الفعلي قبل تسليم الطلب!'
        : '⚠️ GPS required to mark order as delivered!');
      return;
    }
    onUpdateStatus(orderId, 'Delivered', currentUser.name, currentUser.phone);
    setSuccessMsg(isAr ? '🎉 مبروك! تم تسليم الطلب للعميل وإضافة عمولتك لمحفظتك.' : 'Successfully completed delivery! Money added to earnings.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const spawnMockOrder = async () => {
    setIsSpawning(true);
    try {
      const resRest = await fetchWithRetry('/api/restaurants');
      if (!resRest.ok) throw new Error("Could not load restaurants");
      const rests = await resRest.json();
      if (!rests || rests.length === 0) {
        alert(isAr ? "عفوًا، يجب إضافة مطعم واحد على الأقل أولاً من لوحة تحكم الأدمن حتى تتمكن من توليد طلب!" : "You must add at least one restaurant from the Admin panel first.");
        setIsSpawning(false);
        return;
      }
      
      const randomRest = rests[Math.floor(Math.random() * rests.length)];
      const menu = randomRest.menu || [];
      if (menu.length === 0) {
        alert(isAr ? `تنبيه: المطعم "${randomRest.name}" ليس لديه وجبات في المنيو. أضف وجبة أولاً!` : `The restaurant "${randomRest.name}" has an empty menu. Please add items first!`);
        setIsSpawning(false);
        return;
      }
      
      const pickedItem = menu[Math.floor(Math.random() * menu.length)];
      const quantity = Math.floor(Math.random() * 2) + 1;
      
      const cartItem: CartItem = {
        menuItem: pickedItem,
        quantity,
        restaurantId: randomRest.id,
        restaurantName: randomRest.name
      };
      
      const subtotal = pickedItem.price * quantity;
      const deliveryFee = 25;
      const discount = 0;
      const total = subtotal + deliveryFee;
      
      const egyptianNames = ["محمد عبد الرحمن", "أحمد السقا", "كريم عبد العزيز", "منى زكي", "ياسمين صبري", "إبراهيم حسن", "طارق شلبي"];
      const egyptianAddresses = ["بجوار بنك مصر، شارع شهاب، المهندسين", "عمارة 15 مكرر، عباس العقاد، مدينة نصر", "شارع البطل أحمد عبد العزيز، الدقي", "شارع جامعة الدول العربية، أمام ماكدونالدز", "مساكن شيراتون، مصر الجديدة"];
      
      const randomName = egyptianNames[Math.floor(Math.random() * egyptianNames.length)];
      const randomAddress = egyptianAddresses[Math.floor(Math.random() * egyptianAddresses.length)];
      const randomPhone = "01" + Math.floor(100000000 + Math.random() * 900000000).toString();
      
      const newOrder: Order = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        restaurant: randomRest,
        items: [cartItem],
        subtotal,
        deliveryFee,
        discount,
        total,
        status: 'Preparing',
        createdAt: new Date().toISOString(),
        customerName: randomName,
        customerPhone: randomPhone,
        deliveryAddress: randomAddress,
        eta: 35
      };
      
      const postRes = await fetchWithRetry('/api/orders', {
        method: "POST",
        body: JSON.stringify(newOrder)
      });
      
      if (postRes.ok) {
        if (onRefreshData) {
          await onRefreshData();
        }
        setSuccessMsg(isAr ? '🎉 تم توليد طلب تجريبي جديد بنجاح! جاهز للاستلام حالاً في العمود الأيسر.' : 'Spawned a demo order successfully! Ready for pickup.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert("Failed to spawn mock order");
      }
    } catch (err) {
      console.error("Error spawning mock order:", err);
      alert("Error spawning mock order");
    } finally {
      setIsSpawning(false);
    }
  };

  // تصفية الطلبات
  const availableOrders = orders.filter(
    (o) =>
      (o.status === 'Preparing' || o.status === 'Received') &&
      (!o.courierPhone || o.courierPhone.trim() === '')
  );

  const myActiveDeliveries = orders.filter(
    (o) => o.status === 'OutForDelivery' && o.courierPhone === currentUser.phone
  );

  const myCompletedDeliveries = orders.filter(
    (o) => o.status === 'Delivered' && o.courierPhone === currentUser.phone
  );

  const totalEarnings = myCompletedDeliveries.reduce((sum, o) => sum + (o.deliveryFee || 15), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-full cursor-pointer transition-all active:scale-95 flex items-center justify-center shrink-0"
            title={isAr ? 'الرجوع للرئيسية' : 'Go back to HomePage'}
          >
            <ArrowLeft className={`h-5 w-5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-850 font-display">
              {isAr ? '🛵 بوابة كابتن مسافر للتوصيل' : '🛵 Mutafer Captain Workspace'}
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {isAr 
                ? `مرحباً بك، البطل ${currentUser.name} • رقم الموبايل: ${currentUser.phone}`
                : `Welcome, Captain ${currentUser.name} • Mobile: ${currentUser.phone}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onLogout}
            className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>{isAr ? 'تسجيل الخروج 🚪' : 'Exit Captain Portal 🚪'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-150 rounded-2xl text-green-700 font-extrabold text-xs sm:text-sm text-center animate-bounce flex items-center justify-center gap-2">
          <span>🛵</span>
          <span>{successMsg}</span>
        </div>
      )}

      {gpsError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-bold text-xs text-center flex items-center justify-center gap-2">
          <span>📍</span>
          <span>{gpsError}</span>
        </div>
      )}

      {/* GPS Status Banner - يظهر فقط بعد الموافقة */}
      <div className="bg-gradient-to-r from-green-500/95 to-emerald-600/95 text-white rounded-[24px] p-5 sm:p-6 shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 opacity-15 text-9xl pointer-events-none select-none">
          📍
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
              <span className="flex h-3 w-3 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
              </span>
              <span className="font-mono text-[10px] sm:text-xs font-black tracking-widest bg-black/25 px-2.5 py-0.5 rounded-full uppercase">
                {isAr ? 'تتبع خط السير: مفعّل ونشط ●' : 'BEACON STATUS: LIVE LOCAL TRACKING'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black leading-tight">
              {isAr ? '✅ الموقع الجغرافي مفعّل – يمكنك استلام الطلبات' : '✅ GPS Active – You can receive orders'}
            </h3>
            <p className="text-xs sm:text-sm text-green-50 leading-relaxed font-bold">
              {isAr 
                ? 'موقعك الحالي يتم بثه مباشرة لإدارة الطلبات وتوزيعها عليك تلقائياً بأقصى سرعة.'
                : 'Your location is being streamed live to dispatch orders to you automatically.'}
            </p>
            {gpsCoords && (
              <div className="bg-black/35 font-mono text-[10px] sm:text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-2 border border-white/10 mt-1">
                <span>📍 GPS COM:</span>
                <span className="text-green-300 font-extrabold">{gpsCoords.lat.toFixed(6)}° N, {gpsCoords.lng.toFixed(6)}° E</span>
              </div>
            )}
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-2.5 px-4 text-center space-y-1">
              <p className="text-[10px] font-bold text-white/80 uppercase">{isAr ? 'تحديث الموقع الجغرافي' : 'GPS POSITION'}</p>
              <p className="text-xs font-black text-green-300">📡 {isAr ? 'قيد التحديث التلقائي' : 'REAL-TIME TRACKING'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics bento-style highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-600 shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-indigo-500 uppercase font-bold block">{isAr ? 'أرباحك الحالية مع مسافر' : 'Current delivery commission'}</span>
            <span className="text-xl font-mono font-black text-slate-800">{totalEarnings} <span className="text-xs">{isAr ? 'جنيه' : 'EGP'}</span></span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="bg-orange-550/10 p-3 rounded-xl text-[#f94c10] shrink-0">
            <Bike className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-orange-500 uppercase font-bold block">{isAr ? 'رحلاتك الجارية للتوصيل' : 'My active delivery duties'}</span>
            <span className="text-xl font-mono font-black text-slate-800">{myActiveDeliveries.length} <span className="text-xs">{isAr ? 'طلب نشط' : 'active'}</span></span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-green-500/10 p-3 rounded-xl text-green-600 shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-green-500 uppercase font-bold block">{isAr ? 'الطلبات التي قمت بتسليمها' : 'Delivered food orders'}</span>
            <span className="text-xl font-mono font-black text-slate-800">{myCompletedDeliveries.length} <span className="text-xs">{isAr ? 'ألف هنا' : 'completed'}</span></span>
          </div>
        </div>

        {/* Metric 4: Courier Ratings */}
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-600 shrink-0">
            <span className="text-xl">⭐</span>
          </div>
          <div className="space-y-0.5" style={{ textAlign: isAr ? 'right' : 'left' }}>
            <span className="text-[10px] text-amber-550 uppercase font-black block">{isAr ? 'تقييم كفاءة أدائك' : 'Your Service Score'}</span>
            <div className="flex flex-col text-[11px] text-slate-500 font-bold">
              <span>{isAr ? '⚡ السرعة:' : '⚡ Speed:'} <span className="text-slate-800 font-black">{avgSpeed} / 5</span></span>
              <span>{isAr ? '🤝 الأسلوب:' : '🤝 Manner:'} <span className="text-slate-800 font-black">{avgManner} / 5</span></span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Column 1: Active Duties / Captain Journeys */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-lg">🗺️</span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 font-display">
              {isAr ? 'رحلاتك الجارية لتسليمها الآن' : 'Your current active delivery assignments'}
            </h2>
            <span className="bg-[#f94c10] text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full">
              {myActiveDeliveries.length}
            </span>
          </div>

          {myActiveDeliveries.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 space-y-2">
              <span className="text-3xl block">🛌</span>
              <p className="text-xs font-bold">{isAr ? 'لا توجد رحلات جارية حاليـاً! استلم طلباً متوفراً في العمود المجاور لتبدأ.' : 'You have no assigned active orders at this moment.'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myActiveDeliveries.map((order) => (
                <div key={order.id} className="bg-white border-2 border-orange-500/40 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="absolute top-4 left-4 bg-orange-100 text-[#f94c10] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    {isAr ? 'جاري التوصيل 🛵' : 'Out For Delivery 🛵'}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{isAr ? 'رح إلى بوابة المطبخ للاستلام' : 'Restaurant Pickup location'}</span>
                    <h3 className="text-sm font-black text-slate-800">{order.restaurant.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{isAr ? 'الزمالك، القاهرة' : 'Zamalek, Cairo'}</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-100 my-2" />

                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">{isAr ? 'عنوان عميل مسافر للتسليم' : 'Customer destination delivery'}</span>
                    
                    <div className="flex items-start gap-2">
                      <div className="bg-slate-100 text-slate-700 h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        {order.customerName?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-850">{order.customerName}</p>
                        <p className="text-[11px] font-mono font-bold text-slate-500">{order.customerPhone}</p>
                        <p className="text-xs text-slate-650 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1.5">
                          {order.deliveryAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold">{isAr ? 'عمولة التوصيل المخصصة لك:' : 'Your delivery commission:'}</p>
                      <p className="text-sm font-mono font-black text-[#f94c10]">+{order.deliveryFee || 15} {isAr ? 'جنيه' : 'EGP'}</p>
                    </div>

                    <button
                      onClick={() => handleCompleteOrder(order.id)}
                      className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-xs tracking-wide transition-all active:scale-95 shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>{isAr ? '✅ أكملت توصيل الطلب للعميل' : 'Delivered to Customer'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Available Delivery Pickups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-800 font-display">
                {isAr ? 'الطلبات الجاهزة للاستلام حالياً' : 'Available open food delivery pickups'}
              </h2>
            </div>
            <span className="bg-slate-200 text-slate-700 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full">
              {availableOrders.length}
            </span>
          </div>

          <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-2xl flex flex-col gap-2">
            <p className="text-[10px] text-slate-500 font-extrabold" style={{ textAlign: isAr ? 'right' : 'left' }}>
              {isAr ? "💡 هل تبي تجربة بوابة الكابتن؟ اضغط لتوليد طلب تجريبي حالاً واختبر مسار الاستلام والتوصيل الكامل!" : "💡 Want to test the captain flows? Click to spawn a test order instantly to simulate the full journey!"}
            </p>
            <button
              onClick={spawnMockOrder}
              disabled={isSpawning}
              className="w-full bg-[#f94c10] hover:bg-orange-600 text-white font-extrabold py-2.5 px-4 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSpawning ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                  <span>{isAr ? "جاري إنشاء وتجهيز الطلب التجريبي..." : "Simulating order..."}</span>
                </>
              ) : (
                <>
                  <span>📦</span>
                  <span>{isAr ? "توليد طلب تجريبي فوراً 🚀" : "Spawn Instant test order 🚀"}</span>
                </>
              )}
            </button>
          </div>

          {availableOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 space-y-2">
              <span className="text-3xl block">🍿</span>
              <p className="text-xs font-bold">{isAr ? 'لا توجـد طلبات جديدة متاحة للتوصيل الآن!' : 'No open food deliveries waiting right now.'}</p>
              <p className="text-[11px] text-slate-450">{isAr ? 'استخدم الزر البرتقالي الموضح بالأعلى لتوليد طلب تجريبي وبدء تجربة التوصيل فوراً.' : 'Use the orange button above to generate a mock order and test the delivery app now!'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableOrders.map((order) => (
                <div key={order.id} className="bg-white border border-slate-150 hover:border-orange-500/20 rounded-2xl p-4 shadow-xs space-y-3 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase">
                        {order.status === 'Preparing' ? (isAr ? 'قيد التحضير 🍳' : 'Preparing') : (isAr ? 'مقبول 👍' : 'Received')}
                      </span>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 mt-1">{order.restaurant.name}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 font-bold block">{isAr ? 'العمولة' : 'Delivery fee'}</span>
                      <span className="text-xs font-mono font-bold text-green-600">+{order.deliveryFee || 15} {isAr ? 'جنيه' : 'EGP'}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-550 space-y-1">
                    <p className="truncate">
                      📍 <span className="font-bold text-slate-700">{isAr ? 'منطقة العميل:' : 'Customer destination:'}</span> {order.deliveryAddress}
                    </p>
                    <p>
                      🧾 <span className="font-bold text-slate-750">{isAr ? 'ملاحظة:' : 'Short details:'}</span> {order.items.length} {isAr ? 'أصناف محددة' : 'dishes'}
                    </p>
                  </div>

                  <button
                    onClick={() => handlePickUpOrder(order.id)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-xl text-xs transition-all active:scale-98 tracking-wide cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>🏍️</span>
                    <span>{isAr ? 'استلام وبدء توصيل الطلب' : 'Pickup & dispatch order'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* History panel of Completed Deliveries */}
      <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border border-slate-100 space-y-4">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-800 font-display flex items-center gap-1.5 justify-start">
          <span>📜</span>
          <span>{isAr ? 'مستند رحلاتك السابقة المكتملة' : 'Completed Delivery Logs history'}</span>
        </h3>

        {myCompletedDeliveries.length === 0 ? (
          <p className="text-xs text-slate-450 font-bold py-2">
            {isAr ? 'سجل رحلاتك المكتملة فارغ اليوم! طير ووصّل طلبات وهتظهر هنا.' : 'Your history log is clear today, log active delivery duty to fill.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-semibold text-slate-600 text-right">
              <thead>
                <tr className="border-b border-slate-200/60 pb-2">
                  <th className="py-2 pl-3">{isAr ? 'تعريف الفاتورة' : 'Order ID'}</th>
                  <th className="py-2 pl-3">{isAr ? 'اسم المطعم' : 'Restaurant'}</th>
                  <th className="py-2 pl-3">{isAr ? 'المستلم وعنوانه' : 'Customer Area'}</th>
                  <th className="py-2 pl-3">{isAr ? 'العمولة المستلمة' : 'Delivery commission'}</th>
                </tr>
              </thead>
              <tbody>
                {myCompletedDeliveries.map((hl) => (
                  <tr key={hl.id} className="border-b border-slate-100 text-slate-500">
                    <td className="py-2.5 font-mono font-bold text-[10px] sm:text-xs">#{hl.id.replace('order_', '')}</td>
                    <td className="py-2.5 font-black text-slate-700">{hl.restaurant.name}</td>
                    <td className="py-2.5">{hl.customerName} - {hl.deliveryAddress?.split('-')[0]}</td>
                    <td className="py-2.5 font-bold font-mono text-green-600">+{hl.deliveryFee || 15} {isAr ? 'جنيه' : 'EGP'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}