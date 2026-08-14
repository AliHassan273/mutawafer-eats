import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Phone, MessageSquare, Check, RotateCw, Bike, ChefHat, CheckCircle2, Star } from 'lucide-react';
import { Order } from '../types';
import { lang } from '../translations';
import { supabaseConfigured, supabase } from '../lib/supabase';
import { submitReviewToSupabase } from '../services/supabaseOrderService';
import { getOrderCaptainLocation } from '../services/supabaseCaptainService';
import { getPublicSettingsFromSupabase } from '../services/supabaseRestaurantService';

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
        restaurantId: currentOrder.restaurant?.id || '',
        restaurantName: currentOrder.restaurant?.name || 'المطعم',
        courierName: currentOrder.courierName || "الكابتن أحمد",
        ratingDeliverySpeed: ratingSpeed,
        ratingDeliveryManner: ratingManner,
        ratingFoodQuality: ratingFood,
        comment: reviewComment,
      };

      await submitReviewToSupabase(payload);
      setRatedLocally(true);
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
    const load = async () => {
      const data = await getPublicSettingsFromSupabase();
      if (data?.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
    };
    load().catch(err => console.error("Error loading settings in OrderTracker:", err));
  }, []);

  // ✅ جيب موقع الكابتن كل 15 ثانية
  useEffect(() => {
    if (currentOrder.status !== 'OutForDelivery') return;
    const fetchLoc = async () => {
      try {
        setCourierLocation(await getOrderCaptainLocation(currentOrder.id));
      } catch {}
    };
    fetchLoc();
    const interval = setInterval(fetchLoc, 15000);
    return () => clearInterval(interval);
  }, [currentOrder.id, currentOrder.status]);

  // تحديث الطلب وموقع الطيار عبر Supabase Realtime عند استخدام النظام الجديد.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const channel = supabase.channel(`order-${currentOrder.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${currentOrder.id}` }, payload => {
        setCurrentOrder(prev => ({ ...prev, ...payload.new, status: (payload.new as any).status, eta: (payload.new as any).eta }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'captain_locations', filter: `order_id=eq.${currentOrder.id}` }, payload => {
        const row: any = payload.new;
        setCourierLocation(payload.eventType === 'DELETE' ? null : { lat: Number(row.lat), lng: Number(row.lng), updatedAt: row.updated_at });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentOrder.id]);

  // تحديث موقع الطيار وحالة الطلب لحظيًا عبر WebSocket.
  useEffect(() => {
    if (currentOrder.status !== 'OutForDelivery' && currentOrder.status !== 'Delivered') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.onopen = () => socket.send(JSON.stringify({ type: 'subscribe_order', orderId: currentOrder.id }));
    socket.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.event === 'captain_location') setCourierLocation(data.location || null);
        if (data.event === 'captain_offline') setCourierLocation(null);
        if (data.event === 'order_status' && data.order) setCurrentOrder(data.order);
      } catch {}
    };
    return () => socket.close();
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

  // تحديث الحالة يعتمد بالكامل على Supabase Realtime (راجع الـ useEffect بالأعلى).


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
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6" dir={'rtl'}>
      
      {/* Back button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-[#f94c10] text-xs sm:text-sm font-semibold mb-6 group cursor-pointer transition-colors"
      >
        <ArrowLeft className={`h-4 w-4 transition-transform ${'rotate-180 group-hover:translate-x-1'}`} />
        <span>{'الرجوع للرئيسية'}</span>
      </button>

      {/* تفاصيل الطلب الكاملة */}
      <section className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-sm sm:text-base font-black text-slate-800">تفاصيل الطلب كاملة 📦</h2>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600">رقم الطلب: {currentOrder.id}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl p-3"><span className="block text-[10px] text-slate-400 font-bold">اسم العميل</span><strong>{currentOrder.customerName || 'غير مسجل'}</strong></div>
          <div className="bg-slate-50 rounded-xl p-3"><span className="block text-[10px] text-slate-400 font-bold">رقم التواصل</span><strong dir="ltr" className="inline-block">{currentOrder.customerPhone || 'غير مسجل'}</strong></div>
          <div className="bg-slate-50 rounded-xl p-3"><span className="block text-[10px] text-slate-400 font-bold">طريقة الدفع</span><strong>{currentOrder.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : currentOrder.paymentMethod || 'غير محددة'}</strong></div>
        </div>
        <div className="mt-3 bg-slate-50 rounded-xl p-3 text-xs"><span className="block text-[10px] text-slate-400 font-bold mb-1">عنوان التوصيل</span><strong>{currentOrder.deliveryAddress || 'غير مسجل'}</strong></div>
        <div className="mt-3 bg-amber-50 rounded-xl p-3 text-xs"><span className="block text-[10px] text-amber-600 font-bold mb-1">ملاحظات الطلب</span><strong>{(currentOrder as any).notes || 'لا توجد ملاحظات'}</strong></div>
        <div className="mt-4 divide-y divide-slate-100 border border-slate-100 rounded-xl">
          {(currentOrder.items || []).map((item, index) => {
            const size = item.selectedSize ? ` (${item.selectedSize.name})` : '';
            const price = item.selectedSize?.price ?? item.menuItem.price;
            return <div key={`${item.menuItem.id}-${index}`} className="flex items-center justify-between gap-3 p-3 text-xs"><span className="font-bold">{item.menuItem.name}{size} × {item.quantity}</span><strong>{(price * item.quantity).toFixed(0)} جنيه</strong></div>;
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50"><span className="block text-[10px] text-slate-400">الإجمالي الفرعي</span><strong>{Number(currentOrder.subtotal || 0).toFixed(0)} جنيه</strong></div>
          <div className="p-3 rounded-xl bg-slate-50"><span className="block text-[10px] text-slate-400">التوصيل</span><strong>{Number(currentOrder.deliveryFee || 0).toFixed(0)} جنيه</strong></div>
          <div className="p-3 rounded-xl bg-slate-50"><span className="block text-[10px] text-slate-400">الخصم</span><strong>{Number(currentOrder.discount || 0).toFixed(0)} جنيه</strong></div>
          <div className="p-3 rounded-xl bg-orange-50 text-orange-700"><span className="block text-[10px]">الإجمالي النهائي</span><strong>{Number(currentOrder.total || 0).toFixed(0)} جنيه</strong></div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Simulation timeline steps */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between" style={{ textAlign: 'right' }}>
          <div>
            <div className={`flex items-center justify-between mb-2 ${'flex-row-reverse'}`}>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                {'تتبع طلبك مباشر 🔴'}
              </span>
              <span className="text-xs text-[#f94c10] font-mono font-bold bg-orange-50 px-2 py-0.5 rounded-full">
                #{order.id.slice(6, 12).toUpperCase()}
              </span>
            </div>
            
            <h2 className="text-lg md:text-xl font-extrabold text-[#f94c10] font-display">
              {order.restaurant?.name || 'المطعم'}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {'الكباتن في المطعم بيجهزو طلبك الدلع بكل حب.'}
            </p>

            {/* Steps Timeline in UI */}
            <div className={`mt-8 space-y-6 relative ${'pr-6'}`}>
              {/* Timeline join line */}
              <div className={`absolute ${'right-[9px]'} top-3 bottom-3 w-0.5 bg-slate-100`} />

              {/* Step 1: Received */}
              <div className="relative flex items-start gap-4">
                <div className={`absolute ${'right-[-21px]'} h-[10px] w-[10px] rounded-full border-2 ${
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
                      {'تم استلام الطلب 📝'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{'تم التحقق من تفاصيل الطلب بنجاح'}</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Preparing */}
              <div className="relative flex items-start gap-4">
                <div className={`absolute ${'right-[-21px]'} h-[10px] w-[10px] rounded-full border-2 ${
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
                      {'جاري الطبخ والتحضير 👨‍🍳'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{'الشيفات بيحضروا أكلتك الجميلة'}</p>
                  </div>
                </div>
              </div>

              {/* Step 3: OutForDelivery */}
              <div className="relative flex items-start gap-4">
                <div className={`absolute ${'right-[-21px]'} h-[10px] w-[10px] rounded-full border-2 ${
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
                      {'الكابتن طار في الطريق 🛵'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{'كابتن أحمد استلم الوجبة وطاير عليك'}</p>
                  </div>
                </div>
              </div>

              {/* Step 4: Delivered */}
              <div className="relative flex items-start gap-4">
                <div className={`absolute ${'right-[1px]'} h-[10px] w-[10px] rounded-full border-2 ${
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
                      {'وصل بالسلامية! 🎉'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{'ألف هنا وشفا على قلبك يا غالي!'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Courier rider details card */}
          <div className={`border-t border-slate-100 pt-6 mt-6 flex items-center justify-between ${'flex-row-reverse'}`}>
            <div className={`flex items-center gap-3 ${'flex-row-reverse'}`}>
              <div className="h-11 w-11 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200 text-xl">🛵</div>
              <div style={{ textAlign: 'right' }}>
                <p className="text-xs font-bold text-slate-850">{currentOrder.courierName || 'الطيار غير محدد'} 🛵</p>
                <p className="text-[10px] text-slate-500 font-bold">{currentOrder.courierPhone || 'سيظهر رقم التواصل عند إسناد الطلب'}</p>
                <p className="text-[10px] text-green-600 font-bold uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                  <span>{'سواق وموثق ممتاز'}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2" style={{ direction: 'ltr' }}>
              <button 
                onClick={() => {
                  setCourierContactActiveMessage(`📞 جاري الاتصال بـ ${currentOrder.courierName || 'الطيار'} على الرقم ${currentOrder.courierPhone || 'غير متاح'}`);
                  setTimeout(() => setCourierContactActiveMessage(''), 4500);
                }}
                className="h-9 w-9 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full flex items-center justify-center border border-slate-100 cursor-pointer transition-colors"
                title="اتصال بالكابتن"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button 
                onClick={() => {
                  setCourierContactActiveMessage(`💬 تم إرسال رسالتك السريعة إلى ${currentOrder.courierName || 'الطيار'}!`);
                  setTimeout(() => setCourierContactActiveMessage(''), 4500);
                }}
                className="h-9 w-9 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full flex items-center justify-center border border-slate-100 cursor-pointer transition-colors"
                title="رسالة للكابتن"
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
            <div style={{ textAlign: 'right' }}>
              <p className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">{'خريطة التوصيل المباشرة 🗺️'}</p>
              <p className="text-xs font-bold text-slate-805">
                {courierLocation
                  ? ('موقع الكابتن حي الآن')
                  : ('في انتظار موقع الكابتن...')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase shadow-xs">
              <RotateCw className={`h-3 w-3 ${courierLocation ? 'animate-spin text-[#f94c10]' : 'text-slate-300'}`} />
              <span>{courierLocation ? ('حي') : ('انتظار')}</span>
            </div>
          </div>

          {/* Leaflet Map */}
          <div id="tracker-map" className="absolute inset-0 z-0 rounded-3xl overflow-hidden" />

          {!courierLocation && (
            <div className="absolute inset-0 z-5 flex items-center justify-center bg-slate-100/80 rounded-3xl">
              <div className="text-center space-y-2">
                <span className="text-4xl">🛵</span>
                <p className="text-xs font-bold text-slate-500">{'الكابتن في الطريق...'}</p>
                <p className="text-[10px] text-slate-400">{'الخريطة ستظهر بمجرد تحديث موقعه'}</p>
              </div>
            </div>
          )}

                {/* Map bottom strip containing current delivery status */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 flex gap-4 items-center z-10 border border-white/50 shadow-xs relative">
            <div className="bg-[#10b981]/15 p-2 text-[#10b981] rounded-xl shrink-0">
              <Bike className="h-5 w-5" />
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">{'حالة التوصيل الفورية'}</p>
              <h4 className="text-xs font-bold text-slate-805 leading-snug">
                {currentOrder.status === 'Pending' && ('طلبك معلّق الآن قيد المراجعة والموافقة من الإدارة. تم توجيهه للواتساب لتأكيده والموافقة عليه قريبًا! ⏳')}
                {currentOrder.status === 'Received' && ('تم قبول الطلب وجاري توجيهه للمطبخ.')}
                {currentOrder.status === 'Preparing' && ('المطبخ مشغول في طبخ طلبك بكل حب الآن. 👨‍🍳')}
                {currentOrder.status === 'OutForDelivery' && (
                  `الكابتن ${currentOrder.courierName || 'أحمد'} استلم طلبك وانطلق في الطريق لعنوانك! 🏍️ ${currentOrder.courierPhone ? `(تواصل: ${currentOrder.courierPhone})` : ''}`
                )}
                {currentOrder.status === 'Delivered' && ('تم التوصيل بنجاح وبألف هنا وشفا! شكراً لاختيارك مسافر إيتس. 🥰')}
              </h4>
            </div>
          </div>

        </div>

      </div>

      {/* Rating Feedback Popup */}
      {currentOrder.status === 'Delivered' && !currentOrder.reviewed && !ratedLocally && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" />
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-50 relative z-10 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200" style={{ direction: 'rtl' }}>
            <div className="text-center space-y-2">
              <span className="text-4xl block">🎉🍕</span>
              <h3 className="font-display font-extrabold text-slate-800 text-lg">
                {'تقييم تجربة طلبك ورأيك يهمنا'}
              </h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                {'طلبك وصل بألف سلامة وبألف هنا وشفا! ساعدنا نتطور وشاركنا رأيك بكل أمانة حول الجودة والخدمة.'}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {/* Rating 1: Delivery Speed */}
              <div className="space-y-1 text-center">
                <label className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">
                  {'⚡ سرعة الدليفري والتوصيل:'}
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
                  {'🤝 أسلوب ومعاملة كابتن التوصيل:'}
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
                  {'😋 جودة وطعم الأكل الفريش:'}
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
              <div className="space-y-1.5" style={{ textAlign: 'right' }}>
                <label className="text-xs font-black text-slate-600">
                  {'💬 اكتب كلمة حلوة أو رسالتك للعملاء الجايين:'}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={'الأكل كان جامد ومقرمش جداً والدليفري سريع ومحترم للغاية...'}
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
                  <span>{'إرسال التقييم المباشر'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}