import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Phone, MessageSquare, Check, RotateCw, Bike, ChefHat, CheckCircle2, Star } from 'lucide-react';
import { Order } from '../types';
import { lang } from '../translations';
import { fetchWithRetry } from '../utils/fetchHelper';

interface OrderTrackerProps {
  order: Order;
  onBack: () => void;
  onUpdateStatus: (orderId: string, status: 'Pending' | 'Received' | 'Preparing' | 'OutForDelivery' | 'Delivered') => void;
}

export default function OrderTracker({
 order, onBack, onUpdateStatus }: OrderTrackerProps) {
  const isAr = true;

  // We'll simulate courier position along a route path from restaurant to customer.
  // Coordinates range from 0 (at restaurant) to 1 (arrived at destination).
  const [courierProgress, setCourierProgress] = useState(0);
  const [countdownMinutes, setCountdownMinutes] = useState(order.eta);
  const [whatsappNumber, setWhatsappNumber] = useState("201016789012");
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [courierContactActiveMessage, setCourierContactActiveMessage] = useState('');

  // ✅ موقع الكابتن الحقيقي من السيرفر
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Rating states
  const [ratedLocally, setRatedLocally] = useState(false);
  const [ratingSpeed, setRatingSpeed] = useState(5);
  const [ratingManner, setRatingManner] = useState(5);
  const [ratingFood, setRatingFood] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReviewSubmit = async () => {
    setSubmittingReview(true);
    try {
      const payload = {
        orderId: currentOrder.id,
        customerName: currentOrder.customerName,
        restaurantId: currentOrder.restaurant.id,
        restaurantName: currentOrder.restaurant.name,
        courierName: currentOrder.courierName || "Captain Ahmed",
        ratingDeliverySpeed: ratingSpeed,
        ratingDeliveryManner: ratingManner,
        ratingFoodQuality: ratingFood,
        comment: reviewComment,
      };

      const res = await fetchWithRetry('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setRatedLocally(true);
      }
    } catch (err) {
      console.error("Failed to post review in OrderTracker:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Sync to prop updates
  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Load WhatsApp settings
  useEffect(() => {
    fetchWithRetry('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.whatsappNumber) {
          setWhatsappNumber(data.whatsappNumber);
        }
      })
      .catch(err => console.error("Error loading settings in OrderTracker:", err));
  }, []);

  // ✅ جيب موقع الكابتن كل 15 ثانية
  useEffect(() => {
    if (currentOrder.status !== 'OutForDelivery') return;
    const fetchLoc = async () => {
      try {
        const res = await fetchWithRetry('/api/captain/location/' + currentOrder.id);
        if (res.ok) {
          const data = await res.json();
          setCourierLocation(data.location || null);
        }
      } catch {}
    };
    fetchLoc();
    const interval = setInterval(fetchLoc, 15000);
    return () => clearInterval(interval);
  }, [currentOrder.id, currentOrder.status]);

  // ✅ Leaflet map initialization
  useEffect(() => {
    const mapDiv = document.getElementById('tracker-map');
    if (!mapDiv || (mapDiv as any)._leaflet_id) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    if (!document.querySelector('link[href*="leaflet"]')) {
      document.head.appendChild(link);
    }

    const initMap = () => {
      const L = (window as any).L;
      if (!L || (mapDiv as any)._leaflet_id) return;
      const center: [number, number] = courierLocation
        ? [courierLocation.lat, courierLocation.lng]
        : [30.0626, 31.2222];
      const map = L.map('tracker-map', { zoomControl: true, attributionControl: false }).setView(center, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const captainIcon = L.divIcon({ html: '<div style="font-size:28px">🛵</div>', className: '', iconAnchor: [14, 14] });
      if (courierLocation) {
        const m = L.marker([courierLocation.lat, courierLocation.lng], { icon: captainIcon }).addTo(map);
        (mapDiv as any)._captainMarker = m;
      }
      (mapDiv as any)._leafletMap = map;
    };

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, []);

  // ✅ حدّث ماركر الكابتن لما يتغير موقعه
  useEffect(() => {
    const mapDiv = document.getElementById('tracker-map');
    if (!mapDiv) return;
    const existingMarker = (mapDiv as any)._captainMarker;
    if (!courierLocation) {
      if (existingMarker) { existingMarker.remove(); (mapDiv as any)._captainMarker = null; }
      return;
    }
    const map = (mapDiv as any)._leafletMap;
    const L = (window as any).L;
    if (!map || !L) return;
    const captainIcon = L.divIcon({ html: '<div style="font-size:28px">🛵</div>', className: '', iconAnchor: [14, 14] });
    let marker = (mapDiv as any)._captainMarker;
    if (marker) {
      marker.setLatLng([courierLocation.lat, courierLocation.lng]);
    } else {
      marker = L.marker([courierLocation.lat, courierLocation.lng], { icon: captainIcon }).addTo(map);
      (mapDiv as any)._captainMarker = marker;
    }
    map.panTo([courierLocation.lat, courierLocation.lng]);
  }, [courierLocation]);

  // ✅ Poll for status updates every 5 seconds using direct order endpoint
  useEffect(() => {
    let consecutiveFailures = 0;
    const poll = async () => {
      try {
        // ✅ اجيب الأوردر مباشرة بـ id — مش محتاج token
        const res = await fetch('/api/orders/' + order.id);
        if (!res.ok) {
          consecutiveFailures++;
          return;
        }
        const freshOrder = await res.json();
        consecutiveFailures = 0;
        if (freshOrder && freshOrder.id) {
          if (freshOrder.status !== currentOrder.status) {
            onUpdateStatus(order.id, freshOrder.status);
          }
          setCurrentOrder(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(freshOrder)) return freshOrder;
            return prev;
          });
        }
      } catch (err) {
        consecutiveFailures++;
      }
    };

    // initial immediate poll then interval
    poll();
    const pollInterval = setInterval(() => {
      // if many consecutive failures, slow down polling to reduce noise
      if (consecutiveFailures >= 5) return;
      poll();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [order.id, currentOrder, onUpdateStatus]);

  // Handle visual scooter progressive simulation when out for delivery
  useEffect(() => {
    if (currentOrder.status === 'OutForDelivery') {
      const aniInt = setInterval(() => {
        setCourierProgress((prev) => {
          if (prev >= 1.0) return 0.05; // Loop for nice ongoing feedback
          return prev + 0.05;
        });
        setCountdownMinutes((mins) => Math.max(1, mins - 1));
      }, 1800);
      return () => clearInterval(aniInt);
    } else if (currentOrder.status === 'Delivered') {
      setCourierProgress(1.0);
      setCountdownMinutes(0);
    } else {
      setCourierProgress(0);
    }
  }, [currentOrder.status]);

  const handleSendWhatsApp = () => {
     const itemsText = currentOrder.items.map((item) => {
      const name = item.selectedSize ? `${item.menuItem.name} (${item.selectedSize.name})` : item.menuItem.name;
      const price = item.selectedSize ? item.selectedSize.price : item.menuItem.price;
      return `- ${name} (×${item.quantity}) بـ ${price} ج`;
    }).join('\n');
    const totalAmount = currentOrder.total;
    const waText = `طلب جديد من تطبيق مسافر إيتس 🛵
---------------------------
العميل: ${currentOrder.customerName}
الموبايل: ${currentOrder.customerPhone}
العنوان: ${currentOrder.deliveryAddress}
ملاحظات التوصيل: ${(currentOrder as any).notes || "لا يوجد"}

المطعم: ${currentOrder.restaurant.name}
الأصناف المطلوبة:
${itemsText}

الحساب الإجمالي: ${totalAmount} جنيه
---------------------------
شكرًا لطلبك من مسافر إيتس!
`;
    const restaurantWhatsapp = currentOrder.restaurant?.whatsappNumber;
    const finalNumber = restaurantWhatsapp ? restaurantWhatsapp.replace(/[^0-9]/g, "") : whatsappNumber;
    const waUrl = `https://wa.me/${finalNumber}?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, "_blank");
  };


  // Coordinates for Restaurant (Start) and Home (End) in an SVG grid (300 x 200)
  const restX = 60;
  const restY = 110;
  const homeX = 240;
  const homeY = 40;

  // Intermediate curve waypoint coords to draw a realistic city street bend
  const streetBendX = 160;
  const streetBendY = 110;

  // Compute live scooter position based on progress
  let riderX = restX;
  let riderY = restY;

  if (courierProgress <= 0.5) {
    // Stage 1: Restaurant to street intersection point
    const tVal = courierProgress / 0.5;
    riderX = restX + (streetBendX - restX) * tVal;
    riderY = restY + (streetBendY - restY) * tVal;
  } else {
    // Stage 2: Intersection to home address
    const tVal = (courierProgress - 0.5) / 0.5;
    riderX = streetBendX + (homeX - streetBendX) * tVal;
    riderY = streetBendY + (homeY - streetBendY) * tVal;
  }

  // Status index mapping
  const statuses: ('Pending' | 'Received' | 'Preparing' | 'OutForDelivery' | 'Delivered')[] = [
    'Pending',
    'Received',
    'Preparing',
    'OutForDelivery',
    'Delivered'
  ];
  const currentStepIndex = statuses.indexOf(currentOrder.status);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Back button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-[#f94c10] text-xs sm:text-sm font-semibold mb-6 group cursor-pointer transition-colors"
      >
        <ArrowLeft className={`h-4 w-4 transition-transform ${isAr ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
        <span>{isAr ? 'الرجوع للرئيسية' : 'Back To Dashboard'}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Simulation timeline steps */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between" style={{ textAlign: isAr ? 'right' : 'left' }}>
          <div>
            <div className={`flex items-center justify-between mb-2 ${isAr ? 'flex-row-reverse' : ''}`}>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                {isAr ? 'تتبع طلبك مباشر 🔴' : 'Active Order Tracking'}
              </span>
              <span className="text-xs text-[#f94c10] font-mono font-bold bg-orange-50 px-2 py-0.5 rounded-full">
                #{order.id.slice(6, 12).toUpperCase()}
              </span>
            </div>
            
            <h2 className="text-lg md:text-xl font-extrabold text-[#f94c10] font-display">
              {order.restaurant.name}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {isAr ? 'الكباتن في المطعم بيجهزو طلبك الدلع بكل حب.' : 'We started cooking your delicious bite.'}
            </p>

            {/* Countdown Area */}
            <div className={`flex items-center gap-4 bg-slate-50 rounded-2xl p-4 mt-6 border border-slate-100 ${isAr ? 'flex-row-reverse' : ''}`}>
              <div className="bg-orange-150 p-2 text-[#f94c10] rounded-xl shrink-0">
                <Clock className="h-6 w-6 animate-pulse" />
              </div>
              <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                <p className="text-[10px] text-slate-404 font-bold uppercase tracking-wider">{isAr ? 'توقعتنا لوصول دليفرك' : 'Estimated Delivery Time'}</p>
                <p className="text-base sm:text-lg font-black text-slate-855">
                  {currentOrder.status === 'Delivered' 
                    ? (isAr ? 'وصل بألف هنا! 🎉' : 'Delivered!') 
                    : (isAr ? `فاضل حوالي ${countdownMinutes} دقائق` : `${countdownMinutes} Minutes Left`)
                  }
                </p>
                <p className="text-[10px] text-slate-404 font-semibold">
                  {isAr ? `توصيل مباشر إلى: ${order.deliveryAddress}` : `Direct dispatch to ${order.deliveryAddress}`}
                </p>
              </div>
            </div>

            {/* WhatsApp Send CTA */}
            <div className={`mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isAr ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <div>
                <p className="text-[11px] text-emerald-650 font-black uppercase tracking-wider">تأكيد الطلب السريع 🟢</p>
                <p className="text-xs font-bold text-slate-850">إرسال تفاصيل وإيصال المطبخ فوراً عبر الواتساب للمدير</p>
              </div>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0 hover:scale-102"
              >
                <span>إرسال عبر واتساب</span>
              </button>
            </div>

            {/* Steps Timeline in UI */}
            <div className={`mt-8 space-y-6 relative ${isAr ? 'pr-6' : 'pl-6'}`}>
              {/* Timeline join line */}
              <div className={`absolute ${isAr ? 'right-[9px]' : 'left-[9px]'} top-3 bottom-3 w-0.5 bg-slate-100`} />

              {/* Step 1: Received */}
              <div className="relative flex items-start gap-4">
                <div className={`absolute ${isAr ? 'right-[-21px]' : 'left-[-21px]'} h-[10px] w-[10px] rounded-full border-2 ${
                  currentStepIndex >= 0 
                    ? 'bg-green-500 border-green-500 ring-4 ring-green-100' 
                    : 'bg-white border-slate-300'
                }`} />
                <div className="flex gap-2">
                  <div className="shrink-0 mt-0.5">
                    <CheckCircle2 className={`h-4.5 w-4.5 ${currentStepIndex >= 0 ? 'text-green-500' : 'text-slate-300'}`} />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${currentStepIndex >= 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                      {isAr ? 'تم استلام الطلب 📝' : 'Order Placed'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{isAr ? 'تم التحقق من تفاصيل الطلب بنجاح' : 'Secure merchant channel checked first'}</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Preparing */}
              <div className="relative flex items-start gap-4">
                <div className={`absolute ${isAr ? 'right-[-21px]' : 'left-[-21px]'} h-[10px] w-[10px] rounded-full border-2 ${
                  currentStepIndex >= 1 
                    ? 'bg-green-500 border-green-500 ring-4 ring-green-100' 
                    : 'bg-white border-slate-300'
                }`} />
                <div className="flex gap-2">
                  <div className="shrink-0 mt-0.5">
                    <ChefHat className={`h-4.5 w-4.5 ${currentStepIndex >= 1 ? 'text-green-500' : 'text-slate-300'}`} />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${currentStepIndex >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>
                      {isAr ? 'جاري الطبخ والتحضير 👨‍🍳' : 'Kitchen Cooking'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{isAr ? 'الشيفات بيحضروا أكلتك الجميلة' : 'Our master cooks are prepping your items'}</p>
                  </div>
                </div>
              </div>

              {/* Step 3: OutForDelivery */}
              <div className="relative flex items-start gap-4">
                <div className={`absolute ${isAr ? 'right-[-21px]' : 'left-[-21px]'} h-[10px] w-[10px] rounded-full border-2 ${
                  currentStepIndex >= 2 
                    ? 'bg-green-500 border-green-500 ring-4 ring-green-100' 
                    : 'bg-white border-slate-300'
                }`} />
                <div className="flex gap-2">
                  <div className="shrink-0 mt-0.5">
                    <Bike className={`h-4.5 w-4.5 ${currentStepIndex >= 2 ? 'text-green-500' : 'text-slate-300'}`} />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${currentStepIndex >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>
                      {isAr ? 'الكابتن طار في الطريق 🛵' : 'Rider On The Way'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{isAr ? 'كابتن أحمد استلم الوجبة وطاير عليك' : 'We dispatched Captain Ahmed on a scooter'}</p>
                  </div>
                </div>
              </div>

              {/* Step 4: Delivered */}
              <div className="relative flex items-start gap-4">
                <div className={`absolute ${isAr ? 'right-[1px]' : 'left-[1px]'} h-[10px] w-[10px] rounded-full border-2 ${
                  currentStepIndex >= 3 
                    ? 'bg-green-500 border-green-500 ring-4 ring-green-150' 
                    : 'bg-white border-slate-300'
                }`} />
                <div className="flex gap-2">
                  <div className="shrink-0 mt-0.5">
                    <Check className={`h-4.5 w-4.5 ${currentStepIndex >= 3 ? 'text-green-500' : 'text-slate-300'}`} />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${currentStepIndex >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>
                      {isAr ? 'وصل بالسلامية! 🎉' : 'Arrived!'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{isAr ? 'ألف هنا وشفا على قلبك يا غالي!' : 'Enjoy your fresh premium bite!'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Courier rider details card */}
          <div className={`border-t border-slate-100 pt-6 mt-6 flex items-center justify-between ${isAr ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
              <img 
                referrerPolicy="no-referrer"
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80" 
                alt="Captain Ahmed" 
                className="h-11 w-11 rounded-full object-cover border border-slate-200"
              />
              <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                <p className="text-xs font-bold text-slate-850">{isAr ? 'كابتن أحمد الدليفري 🛵' : 'Captain Ahmed'}</p>
                <p className="text-[10px] text-green-600 font-bold uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                  <span>{isAr ? 'سواق وموثق ممتاز' : 'Verified courier'}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2" style={{ direction: 'ltr' }}>
              <button 
                onClick={() => {
                  setCourierContactActiveMessage(isAr ? '📞 جاري محاولة الاتصال المباشر بكابتن أحمد ع الرقم +20114002008' : 'Dialing Captain Ahmed at +20114002008...');
                  setTimeout(() => setCourierContactActiveMessage(''), 4500);
                }}
                className="h-9 w-9 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full flex items-center justify-center border border-slate-100 cursor-pointer transition-colors"
                title="Call Captain"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button 
                onClick={() => {
                  setCourierContactActiveMessage(isAr ? '💬 تم إرسال رسالتك السريعة للكابتن أحمد!' : 'Status update message sent to courier!');
                  setTimeout(() => setCourierContactActiveMessage(''), 4500);
                }}
                className="h-9 w-9 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full flex items-center justify-center border border-slate-100 cursor-pointer transition-colors"
                title="Message Captain"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>

          {courierContactActiveMessage && (
            <div className={`mt-3 py-2 px-3 text-[11px] rounded-lg text-center font-bold animate-pulse ${
              courierContactActiveMessage.includes('📞') ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-700 border border-green-100'
            }`}>
              {courierContactActiveMessage}
            </div>
          )}

        </div>

        {/* Right Side: Real Leaflet Map */}
        <div className="lg:col-span-7 bg-slate-100 rounded-3xl p-4 sm:p-6 border border-slate-200 flex flex-col justify-between relative overflow-hidden h-[380px] sm:h-[450px]">
          {/* Map Title panel */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl px-4 py-3 flex justify-between items-center z-10 border border-white/50 shadow-xs relative">
            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
              <p className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">{isAr ? 'خريطة التوصيل المباشرة 🗺️' : 'Live Map Tracker'}</p>
              <p className="text-xs font-bold text-slate-805">
                {courierLocation
                  ? (isAr ? 'موقع الكابتن حي الآن' : 'Live courier location')
                  : (isAr ? 'في انتظار موقع الكابتن...' : 'Waiting for courier location...')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase shadow-xs">
              <RotateCw className={`h-3 w-3 ${courierLocation ? 'animate-spin text-[#f94c10]' : 'text-slate-300'}`} />
              <span>{courierLocation ? (isAr ? 'حي' : 'Live') : (isAr ? 'انتظار' : 'Waiting')}</span>
            </div>
          </div>

          {/* Leaflet Map */}
          <div id="tracker-map" className="absolute inset-0 z-0 rounded-3xl overflow-hidden" />

          {!courierLocation && (
            <div className="absolute inset-0 z-5 flex items-center justify-center bg-slate-100/80 rounded-3xl">
              <div className="text-center space-y-2">
                <span className="text-4xl">🛵</span>
                <p className="text-xs font-bold text-slate-500">{isAr ? 'الكابتن في الطريق...' : 'Courier on the way...'}</p>
                <p className="text-[10px] text-slate-400">{isAr ? 'الخريطة ستظهر بمجرد تحديث موقعه' : 'Map will appear once GPS syncs'}</p>
              </div>
            </div>
          )}

                {/* Map bottom strip containing current delivery status */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 flex gap-4 items-center z-10 border border-white/50 shadow-xs relative">
            <div className="bg-[#10b981]/15 p-2 text-[#10b981] rounded-xl shrink-0">
              <Bike className="h-5 w-5" />
            </div>
            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
              <p className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">{isAr ? 'حالة التوصيل الفورية' : 'Live dispatch feedback'}</p>
              <h4 className="text-xs font-bold text-slate-805 leading-snug">
                {currentOrder.status === 'Pending' && (isAr ? 'طلبك معلّق الآن قيد المراجعة والموافقة من الإدارة. تم توجيهه للواتساب لتأكيده والموافقة عليه قريبًا! ⏳' : 'Your order is pending review and approval by management. It was sent to WhatsApp and will be approved soon! ⏳')}
                {currentOrder.status === 'Received' && (isAr ? 'تم قبول الطلب وجاري توجيهه للمطبخ.' : 'Order acknowledged and sent to the kitchen.')}
                {currentOrder.status === 'Preparing' && (isAr ? 'المطبخ مشغول في طبخ طلبك بكل حب الآن. 👨‍🍳' : 'Kitchen cooking is underway.')}
                {currentOrder.status === 'OutForDelivery' && (isAr 
                  ? `الكابتن ${currentOrder.courierName || 'أحمد'} استلم طلبك وانطلق في الطريق لعنوانك! 🏍️ ${currentOrder.courierPhone ? `(تواصل: ${currentOrder.courierPhone})` : ''}` 
                  : `Courier ${currentOrder.courierName || 'Ahmed'} has picked up your order and is on the way! 🏍️ ${currentOrder.courierPhone ? `(phone: ${currentOrder.courierPhone})` : ''}`)}
                {currentOrder.status === 'Delivered' && (isAr ? 'تم التوصيل بنجاح وبألف هنا وشفا! شكراً لاختيارك مسافر إيتس. 🥰' : 'Delivered successfully. Thank you for choosing Mutafer Eats! 🥰')}
              </h4>
            </div>
          </div>

        </div>

      </div>

      {/* Rating Feedback Popup */}
      {currentOrder.status === 'Delivered' && !currentOrder.reviewed && !ratedLocally && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" />
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-50 relative z-10 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
            <div className="text-center space-y-2">
              <span className="text-4xl block">🎉🍕</span>
              <h3 className="font-display font-extrabold text-slate-800 text-lg">
                {isAr ? 'تقييم تجربة طلبك ورأيك يهمنا' : 'Rate Your Delivery & Experience!'}
              </h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                {isAr 
                  ? 'طلبك وصل بألف سلامة وبألف هنا وشفا! ساعدنا نتطور وشاركنا رأيك بكل أمانة حول الجودة والخدمة.'
                  : 'Your order has been delivered! Help us improve our daily food and delivery services.'}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {/* Rating 1: Delivery Speed */}
              <div className="space-y-1 text-center">
                <label className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">
                  {isAr ? '⚡ سرعة الدليفري والتوصيل:' : '⚡ Delivery speed:'}
                </label>
                <div className="flex justify-center gap-2" style={{ direction: 'ltr' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={`speed-${star}`}
                      onClick={() => setRatingSpeed(star)}
                      className="p-1 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <Star className={`h-6 w-6 ${star <= ratingSpeed ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating 2: Delivery Manner */}
              <div className="space-y-1 text-center">
                <label className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">
                  {isAr ? '🤝 أسلوب ومعاملة كابتن التوصيل:' : '🤝 Courier Attitude & Respect:'}
                </label>
                <div className="flex justify-center gap-2" style={{ direction: 'ltr' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={`manner-${star}`}
                      onClick={() => setRatingManner(star)}
                      className="p-1 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <Star className={`h-6 w-6 ${star <= ratingManner ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating 3: Food Quality */}
              <div className="space-y-1 text-center">
                <label className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">
                  {isAr ? '😋 جودة وطعم الأكل الفريش:' : '😋 Food Taste & Freshness:'}
                </label>
                <div className="flex justify-center gap-2" style={{ direction: 'ltr' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={`food-${star}`}
                      onClick={() => setRatingFood(star)}
                      className="p-1 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <Star className={`h-6 w-6 ${star <= ratingFood ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom comment input */}
              <div className="space-y-1.5" style={{ textAlign: isAr ? 'right' : 'left' }}>
                <label className="text-xs font-black text-slate-600">
                  {isAr ? '💬 اكتب كلمة حلوة أو رسالتك للعملاء الجايين:' : '💬 Leave an optional review comment:'}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={isAr ? 'الأكل كان جامد ومقرمش جداً والدليفري سريع ومحترم للغاية...' : 'E.g. Food was fresh and tasty, delivery boy is polite...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#f94c10]/20 h-16 resize-none font-semibold transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleReviewSubmit}
              disabled={submittingReview}
              className="w-full bg-[#f94c15] hover:bg-orange-600 text-white font-extrabold text-xs py-3 rounded-2xl transition-all shadow-md cursor-pointer disabled:bg-slate-400 flex items-center justify-center gap-1.5"
            >
              {submittingReview ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>⭐</span>
                  <span>{isAr ? 'إرسال التقييم المباشر' : 'Submit Review'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}