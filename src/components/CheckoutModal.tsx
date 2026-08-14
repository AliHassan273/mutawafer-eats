import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, User, CreditCard, ShoppingBag, ShieldCheck } from 'lucide-react';
import { CartItem, Restaurant } from '../types';
import { lang, getTranslation } from '../translations';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  discount: number;
  deliveryOptions: { id: string; name: string; fee: number }[];
  currentAddress: string;
  onPlaceOrder: (
    customerName: string, 
    customerPhone: string, 
    notes: string, 
    paymentMethod: string, 
    deliveryFee: number, 
    deliveryAddress: string,
    paymentDetails?: string,
    vodafoneFee?: number,
    doorstepDelivery?: boolean,
    deliveryRegionId?: string
  ) => void;
  currentUser: { id: string; name: string; email: string; phone: string; role?: string } | null;
  settings?: any;
  restaurant?: Restaurant;
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
    'Premium Nigiri Tasting': 'وجبة توجبه تذوق نيجيري فاخرة 🍣',
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

export default function CheckoutModal({

  isOpen,
  onClose,
  cart,
  subtotal,
  discount,
  deliveryOptions,
  currentAddress,
  onPlaceOrder,
  currentUser,
  settings,
  restaurant,
}: CheckoutModalProps) {
  const isAr = true;
  const t = (key: any, params?: any) => getTranslation(key, lang as any, params);

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // cod, card, or vodafone
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [exactAddress, setExactAddress] = useState(currentAddress);
  const [doorstepDelivery, setDoorstepDelivery] = useState(false);
  
  // Card input states
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Vodafone number state
  const [vodafoneNumber, setVodafoneNumber] = useState('');

  const [selectedRegion, setSelectedRegion] = useState<any>(
    deliveryOptions && deliveryOptions.length > 0 
      ? deliveryOptions[0]
      : null
  );

  // Dynamic Leaflet Loading & Configuration
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    let mapInstance: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById('checkout-map');
      if (!container) return;

      // Default to Cairo center coords: 30.0444, 31.2357
      const initialLat = 30.0444;
      const initialLng = 31.2357;

      try {
        mapInstance = L.map('checkout-map', {
          zoomControl: true,
          attributionControl: false
        }).setView([initialLat, initialLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(mapInstance);

        // Render standard custom HTML Pin (avoids breaking relative image paths in Vite build)
        const customIcon = L.divIcon({
          className: 'custom-leaflet-icon',
          html: `<div class="w-9 h-9 flex items-center justify-center bg-white border-2 border-orange-500 rounded-full shadow-lg hover:scale-105 transition-all animate-bounce">
                   <span class="text-lg">📍</span>
                 </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });

        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
          icon: customIcon
        }).addTo(mapInstance);

        const handleLocationChange = async (lat: number, lng: number) => {
          try {
            // Call OpenStreetMap Nominatim reverse geocoder free API
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
            const res = await fetch(url, {
              headers: { 'Accept-Language': 'ar' }
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name && isSubscribed) {
                setExactAddress(data.display_name);
              }
            } else {
              if (isSubscribed) {
                setExactAddress(`${'احداثيات موقع محدد'} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
              }
            }
          } catch (e) {
            console.error("OSM Geocoding connection issue:", e);
            if (isSubscribed) {
              setExactAddress(`${'موقع الخريطة المحدد'} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            }
          }
        };

        // Listen for map taps
        mapInstance.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          handleLocationChange(lat, lng);
        });

        // Listen for marker drag release
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          handleLocationChange(pos.lat, pos.lng);
        });
      } catch (err) {
        console.error("Map initialization failed:", err);
      }
    };

    // Lazy load standard CSS & JS from stable ESM/unpkg CDN
    if (!(window as any).L) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          setTimeout(() => {
            if (isSubscribed) initMap();
          }, 400);
        };
        document.body.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if ((window as any).L) {
            clearInterval(interval);
            if (isSubscribed) initMap();
          }
        }, 150);
      }
    } else {
      setTimeout(() => {
        if (isSubscribed) initMap();
      }, 80);
    }

    return () => {
      isSubscribed = false;
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;


  const isDistancePricing = settings?.deliveryPricingType === 'distance';
  const activeDeliveryFee = isDistancePricing
    ? Math.round((Number(settings?.distanceBaseFee) || 10) + ((restaurant?.distance || 1.2) * (Number(settings?.distanceFeePerKm) || 5)))
    : (selectedRegion ? selectedRegion.fee : 15);

  const doorstepFee = doorstepDelivery ? 5 : 0;
  const restaurantCount = new Set(cart.map(item => item.restaurantId)).size;
  const additionalRestaurantFee = Math.max(0, restaurantCount - 1) * 5;
  const vodafoneFee = paymentMethod === 'vodafone' ? Math.ceil(subtotal / 500) * 5 : 0;
  const activeTotal = Math.max(0, subtotal + activeDeliveryFee + additionalRestaurantFee + vodafoneFee + doorstepFee - discount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorText('من فضلك دخل اسم المستلم بشكل صحيح.');
      return;
    }
    if (!phone.trim()) {
      setErrorText('من فضلك رقم تليفون شغال عشان الكابتن يتواصل معاك.');
      return;
    }
    if (!exactAddress.trim()) {
      setErrorText('من فضلك دخل عنوانك التفصيلي لضمان سرعة الوصول.');
      return;
    }

    if (paymentMethod === 'card') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (!cleanCard || cleanCard.length !== 16) {
        setErrorText('يرجى إدخال رقم بطاقة الفيزا بشكل صحيح (16 رقم).');
        return;
      }
      if (!cardExpiry.trim() || !cardExpiry.includes('/')) {
        setErrorText('يرجى إدخال تاريخ انتهاء الكارت بشكل صحيح (MM/YY).');
        return;
      }
      if (!cardCvv.trim() || cardCvv.length < 3) {
        setErrorText('يرجى إدخال رمز التحقق (CVV) المكون من 3 أرقام.');
        return;
      }
    }

    if (paymentMethod === 'vodafone') {
      if (!vodafoneNumber.trim() || vodafoneNumber.length < 11) {
        setErrorText('يرجى إدخال رقم محفظة فودافون كاش المكون من 11 رقم.');
        return;
      }
    }
    
    setErrorText('');
    setLoading(true);

    const chosenRegionName = isDistancePricing ? ("توصيل حسب المسافة") : (selectedRegion ? selectedRegion.name : "الزمالك");
    const fullDeliveryAddress = isDistancePricing 
      ? `${exactAddress.trim()} (${restaurant?.distance || 1.2} كم)`
      : `${chosenRegionName} - ${exactAddress.trim()}`;

    const paymentDetails = paymentMethod === 'card'
      ? (`بطاقة منتهية بـ ${cardNumber.slice(-4)}`)
      : paymentMethod === 'vodafone'
        ? (`فودافون كاش - محفظة ${vodafoneNumber}`)
        : `الدفع عند الاستلام`;

    // Simulate short network latency
    setTimeout(() => {
      setLoading(false);
      onPlaceOrder(name, phone, notes, paymentMethod, activeDeliveryFee, fullDeliveryAddress, paymentDetails, vodafoneFee, doorstepDelivery, selectedRegion?.id);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dim overlay */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-50 relative z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] sm:max-h-[88vh] flex flex-col" dir={'rtl'}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-orange-50 text-[#f94c10] p-1.5 rounded-xl">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="font-display font-extrabold text-slate-800 text-sm sm:text-base">
              {'إتمام الطلب بأمان 🔒'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer font-bold transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body Scroll container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {errorText && (
            <div className="bg-red-50 text-red-600 text-xs px-4 py-3 rounded-2xl border border-red-100 font-semibold">
              {errorText}
            </div>
          )}

          {/* Customer Details section */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider" style={{ textAlign: 'right' }}>
              {'بيانات المستلم الكِرِام'}
            </h4>
            
            {/* Full Name input */}
            <div className="space-y-1.5" style={{ textAlign: 'right' }}>
              <label className="text-xs font-bold text-slate-650 flex items-center gap-1.5 justify-start">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>{'الاسم بالكامل'}</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={'دخل اسمك هنا...'}
                className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border-0 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none font-medium"
              />
            </div>

            {/* Phone Number input */}
            <div className="space-y-1.5" style={{ textAlign: 'right' }}>
              <label className="text-xs font-bold text-slate-650 flex items-center gap-1.5 justify-start">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> 
                <span>{'رقم التليفون'}</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 114 567 890"
                className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border-0 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none font-medium"
              />
            </div>

            {/* Map Pinpoint and Typed Address Widget */}
            <div className="space-y-2" style={{ textAlign: 'right' }}>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-start">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span className="font-black text-xs">{'مكان التوصيل (حدد موقعك بالخريطة أو اكتبه بالكامل) 🗺️'}</span>
              </label>

              {/* Interactive Leaflet Map Div — بيظهر بس مع التسعير بالمسافة */}
              {isDistancePricing && (
                <div 
                  id="checkout-map" 
                  className="w-full h-48 sm:h-52 bg-slate-100 rounded-2xl border border-slate-200 relative overflow-hidden shadow-inner cursor-crosshair" 
                  style={{ minHeight: '190px' }}
                />
              )}

              <p className="text-[10px] text-slate-450 leading-normal" style={{ textAlign: 'right' }}>
                💡 {'يمكنك سحب الدبوس 📍 أو الضغط على أي مكان بالخريطة لتحديد موقعك تلقائياً.'}
              </p>
            </div>

            {/* Region selection if By Region Pricing is active */}
            {!isDistancePricing && (
              <div className="space-y-1.5" style={{ textAlign: 'right' }}>
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 justify-start">
                  <span>🏢</span>
                  <span>{'منطقة التوصيل (الحي)'}</span>
                </label>
                <select
                  value={selectedRegion?.id || ''}
                  onChange={(e) => {
                    const found = deliveryOptions.find(o => o.id === e.target.value);
                    if (found) setSelectedRegion(found);
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-orange-500/20 outline-none font-bold"
                >
                  {deliveryOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} ({opt.fee} {'جنيه شحن'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Exact address input */}
            <div className="space-y-1.5" style={{ textAlign: 'right' }}>
              <label className="text-xs font-bold text-slate-650 flex items-center gap-1.5 justify-start">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{'العنوان التفصيلي للتوصيل 🏢'}</span>
              </label>
              <input
                type="text"
                required
                value={exactAddress}
                onChange={(e) => setExactAddress(e.target.value)}
                placeholder={'تأكيد اسم الشارع، رقم العمارة، الطابق، ورقم الشقة...'}
                className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border text-slate-800 border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-orange-500/20 transition-all outline-none font-semibold"
              />
            </div>

            {/* Doorstep Delivery Option */}
            <div className="bg-orange-50/20 border border-orange-100 p-4 rounded-2xl flex items-center justify-between gap-3 select-none" style={{ direction: 'rtl' }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🚪</span>
                <div style={{ textAlign: 'right' }}>
                  <p className="text-xs font-black text-slate-800">
                    {'توصيل لحد باب البيت 🚪'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {'الكابتن هيطلعلك لحد باب الشقة (+5 جنيه شحن إضافي)'}
                  </p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={doorstepDelivery}
                onChange={(e) => setDoorstepDelivery(e.target.checked)}
                className="h-4 w-4 text-[#f94c10] focus:ring-[#f94c10] border-slate-300 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Optional kitchen driver notes */}
            <div className="space-y-1.5" style={{ textAlign: 'right' }}>
              <label className="text-xs font-bold text-slate-650">
                {'ملاحظات الطلب'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={'مثال: رن جرس شقة ٢ب، سيب الطلب ع الباب'}
                className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border-0 rounded-xl px-4 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none resize-none h-16 font-medium"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider" style={{ textAlign: 'right' }}>
              {'طريقة الدفع'}
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              {/* Cash On Delivery */}
              <div
                onClick={() => setPaymentMethod('cod')}
                className={`border p-2.5 rounded-2xl cursor-pointer flex flex-col justify-between h-24 transition-all select-none ${
                  paymentMethod === 'cod'
                    ? 'border-[#f94c10] bg-orange-50/40 text-[#f94c10]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold tracking-tight">{'كاش عند الاستلام'}</span>
                  <input 
                    type="radio" 
                    checked={paymentMethod === 'cod'} 
                    onChange={() => setPaymentMethod('cod')}
                    className="text-[#f94c10] focus:ring-[#f94c10]" 
                  />
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">
                  {'الدفع نقدًا للكابتن عند الباب'}
                </span>
              </div>

              {/* Card option */}
              <div
                onClick={() => setPaymentMethod('card')}
                className={`border p-2.5 rounded-2xl cursor-pointer flex flex-col justify-between h-24 transition-all select-none ${
                  paymentMethod === 'card'
                    ? 'border-[#f94c10] bg-orange-50/40 text-[#f94c10]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold tracking-tight">{'فيزا / كارت 💳'}</span>
                  <input 
                    type="radio" 
                    checked={paymentMethod === 'card'} 
                    onChange={() => setPaymentMethod('card')}
                    className="text-[#f94c10] focus:ring-[#f94c10]" 
                  />
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">
                  {'دفع آمن بالفيزا والماستر كارد'}
                </span>
              </div>

              {/* Vodafone Cash option */}
              <div
                onClick={() => setPaymentMethod('vodafone')}
                className={`border p-2.5 rounded-2xl cursor-pointer flex flex-col justify-between h-24 transition-all select-none ${
                  paymentMethod === 'vodafone'
                    ? 'border-[#f94c10] bg-orange-50/40 text-[#f94c10]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold tracking-tight">{'فودافون كاش 🔴'}</span>
                  <input 
                    type="radio" 
                    checked={paymentMethod === 'vodafone'} 
                    onChange={() => setPaymentMethod('vodafone')}
                    className="text-[#f94c10] focus:ring-[#f94c10]" 
                  />
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">
                  {'تحويل فودافون كاش فوري'}
                </span>
              </div>
            </div>

            {/* Conditional input details for Visa Card payment */}
            {paymentMethod === 'card' && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150" style={{ textAlign: 'right' }}>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-[#f94c10]" />
                  <span className="text-xs font-extrabold text-slate-800">{'تفاصيل بطاقة الفيزا / ماستركارد'}</span>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">{'رقم الكارت (16 رقم)'}</label>
                  <input 
                    type="text" 
                    maxLength={19}
                    placeholder="4000 1234 5678 9010" 
                    value={cardNumber}
                    onChange={(e) => {
                      // format with spaces
                      const val = e.target.value.replace(/\D/g, '');
                      const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                      setCardNumber(formatted);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500/20 outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">{'تاريخ الانتهاء'}</label>
                    <input 
                      type="text" 
                      maxLength={5}
                      placeholder="MM/YY" 
                      value={cardExpiry}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length >= 2) {
                          setCardExpiry(val.slice(0, 2) + '/' + val.slice(2, 4));
                        } else {
                          setCardExpiry(val);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500/20 outline-none font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">{'الرمز السري (CVV)'}</label>
                    <input 
                      type="password" 
                      maxLength={3}
                      placeholder="•••" 
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500/20 outline-none font-mono text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">{'اسم صاحب البطاقة'}</label>
                  <input 
                    type="text" 
                    placeholder="أحمد محمد" 
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Conditional input details for Vodafone Cash payments */}
            {paymentMethod === 'vodafone' && (
              <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150" style={{ textAlign: 'right' }}>
                <div className="flex items-center gap-2 mb-1 text-red-700">
                  <span className="text-base">🔴</span>
                  <span className="text-xs font-extrabold">{'خطوات التحويل فودافون كاش'}</span>
                </div>
                
                <div className="text-xs text-slate-600 leading-relaxed space-y-1 font-semibold">
                  <p>
                    {`1. قم بتحويل مبلغ ${(subtotal + activeDeliveryFee + vodafoneFee - discount).toFixed(0)} جنيه مصري إلى رقم محفظتنا التالي:`}
                  </p>
                  <div className="bg-white border border-red-100 rounded-xl p-2.5 text-center font-mono text-sm font-black text-red-600 tracking-wider">
                    {settings?.whatsappNumber || "01016789012"}
                  </div>
                  <p className="text-[10px] text-red-600">
                    💡 {'رسوم فودافون كاش الإضافية (+5 جنيه لكل 500 جنيه) تم احتسابها تلقائياً بالأسفل.'}
                  </p>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-bold text-slate-600">{'رقم المحفظة التي قمت بالتحويل منها'}</label>
                  <input 
                    type="text" 
                    maxLength={11}
                    placeholder="010XXXXXXXX" 
                    value={vodafoneNumber}
                    onChange={(e) => setVodafoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500/20 outline-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Itemized pricing audit */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2" style={{ textAlign: 'right' }}>
              {'تفاصيل الفاتورة 🧾'}
            </h5>
            {cart.map(item => {
              const dishName = (DISH_NAMES_MAP[lang] as any)?.[item.menuItem.name] || item.menuItem.name;
              const unitPrice = item.selectedSize ? item.selectedSize.price : item.menuItem.price;
              return (
                <div key={`${item.menuItem.id}-${item.selectedSize?.id || 'default'}`} className={`flex justify-between items-center text-xs font-semibold text-slate-600 ${'flex-row-reverse'}`}>
                  <span className="truncate max-w-[200px]">
                    {item.quantity}x {dishName}
                    {item.selectedSize && (
                      <span className="inline-block text-[9px] font-bold text-orange-600 bg-orange-50 px-1 rounded mx-1">
                        {item.selectedSize?.name || 'الحجم المحدد'}
                      </span>
                    )}
                  </span>
                  <span>{(unitPrice * item.quantity).toFixed(0)} {t('egp')}</span>
                </div>
              );
            })}
            
            <div className="border-t border-slate-200/50 pt-2 my-2 space-y-1 text-xs">
              <div className={`flex justify-between text-slate-500 font-semibold ${'flex-row-reverse'}`}>
                <span>{'تمن الأكل'}</span>
                <span>{subtotal.toFixed(0)} {t('egp')}</span>
              </div>
              {discount > 0 && (
                <div className={`flex justify-between text-green-600 font-bold ${'flex-row-reverse'}`}>
                  <span>{'خصم الكوبون'}</span>
                  <span>-{discount.toFixed(0)} {t('egp')}</span>
                </div>
              )}
              <div className={`flex justify-between text-slate-500 font-semibold ${'flex-row-reverse'}`}>
                <span>{'حساب الدليفري'}</span>
                <span>{activeDeliveryFee === 0 ? ('مجاني يا بطل') : `${activeDeliveryFee.toFixed(0)} ${t('egp')}`}</span>
              </div>
              {paymentMethod === 'vodafone' && (
                <div className={`flex justify-between text-red-600 font-bold ${'flex-row-reverse'}`}>
                  <span>{'رسوم فودافون كاش (+5 لكل 500)'}</span>
                  <span>+{vodafoneFee.toFixed(0)} {t('egp')}</span>
                </div>
              )}
              {additionalRestaurantFee > 0 && (
                <div className={`flex justify-between text-orange-600 font-bold ${'flex-row-reverse'}`}>
                  <span>رسوم تعدد المطاعم ({restaurantCount} مطاعم)</span>
                  <span>+{additionalRestaurantFee} {t('egp')}</span>
                </div>
              )}
              {doorstepDelivery && (
                <div className={`flex justify-between text-[#f94c15] font-bold ${'flex-row-reverse'}`}>
                  <span>{'خدمة حد باب البيت 🚪'}</span>
                  <span>+5 {t('egp')}</span>
                </div>
              )}
              <div className={`flex justify-between text-slate-900 font-extrabold text-sm pt-1 ${'flex-row-reverse'}`}>
                <span>{'إجمالي الدفع'}</span>
                <span className="font-display text-[#f94c15]">{activeTotal.toFixed(0)} {t('egp')}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col justify-end gap-2 shrink-0">
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-[#f94c15] hover:bg-[#e03d08] text-white py-3 rounded-xl font-bold font-display text-xs sm:text-sm flex items-center justify-center gap-2 hover:scale-102 transition-all cursor-pointer shadow-md disabled:bg-slate-400 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>{'جاري تسجيل وإرسال طلبك للواتساب...'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>{t('placeOrder')} ({activeTotal.toFixed(0)} {t('egp')})</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
