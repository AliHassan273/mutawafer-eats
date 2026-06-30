import React, { useState } from 'react';
import { Zap, FastForward, Check, ChevronRight, HelpCircle } from 'lucide-react';
import { lang } from '../translations';

interface PromoBannersProps {
  onPromoCopy: (code: string) => void;
}

export default function PromoBanners({
 onPromoCopy }: PromoBannersProps) {
  const isAr = lang === 'ar';

  const [copied, setCopied] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);


  const handleCopyCode = () => {
    navigator.clipboard.writeText('FIRST50');
    setCopied(true);
    onPromoCopy('FIRST50');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="px-4 md:px-8 mt-4 md:mt-6" dir={'rtl'}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Wide Banner: Get 50% OFF */}
        <div 
          onClick={handleCopyCode}
          className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all border border-slate-800 group"
        >
          {/* Faded Background Food Silhouette */}
          <div className={`absolute ${'left-0'} bottom-0 opacity-10 sm:opacity-20 pointer-events-none translate-x-10 translate-y-10 group-hover:scale-105 transition-all`}>
            <img 
              referrerPolicy="no-referrer"
              src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80" 
              alt="Decoration" 
              className="w-80 h-80 object-cover rounded-full"
            />
          </div>

          <div className="z-10 flex-1">
            <span className="inline-block bg-[#f94c10] text-white text-[10px] md:text-xs font-bold tracking-wider px-3 py-1 rounded-full uppercase mb-4 shadow-sm">
              {'عرض فريش ومحدود ⏳'}
            </span>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight font-display">
              <>
                خد <span className="text-amber-400">خصم ٥٠٪</span> <br />
                على أول أوردر ليك!
              </>
            </h3>
            <p className="text-slate-300 text-xs mt-2 font-medium">
              {'إضغط هنا لنسخ الكود'} <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 font-mono text-sm">FIRST50</code>
            </p>
          </div>

          <div className="z-10 shrink-0">
            <button className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              copied 
                ? 'bg-green-500 text-white' 
                : 'bg-white hover:bg-slate-100 text-slate-900 hover:scale-105 shadow-sm'
            }`}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  {'تم نسخ الكود!'}
                </>
              ) : (
                <>
                  {'انسخ كود الدلع'}
                  <ChevronRight className={`h-4 w-4 text-slate-400 ${'rotate-180'}`} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Banner: Super Fast Delivery */}
        <div 
          onClick={() => setShowDeliveryModal(true)}
          className="bg-amber-400 hover:bg-amber-400/90 rounded-3xl p-6 flex flex-col justify-between items-start relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all group"
        >
          {/* Abstract bolt overlay */}
          <div className="absolute right-[-20px] bottom-[-20px] text-amber-300 opacity-20 pointer-events-none group-hover:scale-110 transition-all">
            <Zap size={180} strokeWidth={1} fill="currentColor" />
          </div>

          <div className="flex justify-between items-start w-full">
            <div className="bg-amber-500 text-amber-950 p-2 rounded-2xl">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <div className="text-[10px] font-bold text-amber-950/70 border border-amber-950/25 px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> {'تفاصيل'}
            </div>
          </div>

          <div className="mt-8 z-10">
            <h3 className="text-xl font-extrabold text-amber-950 tracking-tight font-display">
              {'طيارات توصيل سريعة 🛵'}
            </h3>
            <p className="text-amber-900 text-xs font-semibold mt-1 flex items-center gap-1 text-opacity-80">
              <FastForward className="h-3.5 w-3.5" /> {'متوسط الوقت: ٢٤ دقيقة'}
            </p>
          </div>

          <p className="text-[10px] text-amber-950/60 font-semibold mt-4 hover:underline">
            {'شوف إزاي بنوصل بالسرعة دي ←'}
          </p>
        </div>

      </div>

      {/* Super Fast Delivery Explanation Overlay */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowDeliveryModal(false)} />
          
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative z-10 border border-slate-50 animate-in fade-in zoom-in-95 duration-150" dir={'rtl'}>
            <button 
              onClick={() => setShowDeliveryModal(false)}
              className={`absolute ${'left-4'} top-4 hover:bg-slate-100 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer font-bold`}
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-400 p-2 text-slate-900 rounded-2xl">
                <Zap className="h-6 w-6 fill-current text-amber-950" />
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 className="font-display font-extrabold text-slate-800 text-lg">
                  {'سرعة دليفري مسافر إيتس'}
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  {'ليه دايماً في حدود ٢٤ دقيقة؟'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium" style={{ textAlign: 'right' }}>
              {'النظام الذكي لمسافر إيتس بيربط طلبك مع أقرب كابتن دليفري من المطعم في نفس لحظة دخوله المطبخ، وبكده الأكل بيخرج من بوتاجاز المطعم لبوكس الكابتن لعنوانك مباشرة!'}
            </p>

            <div className="space-y-3" style={{ textAlign: 'right' }}>
              <div className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded-2xl transition-all">
                <span className="bg-orange-50 text-[#f94c10] p-1.5 rounded-xl font-bold text-xs font-mono">01</span>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">
                    {'ربط المطبخ الفوري 💻'}
                  </h5>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {'الطلب بيظهر فوراً على شاشات المطبخ من غير أي تأخير أو مراجعة ورقية.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded-2xl transition-all">
                <span className="bg-orange-50 text-[#f94c10] p-1.5 rounded-xl font-bold text-xs font-mono">02</span>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">
                    {'تحديد كابتن المنطقة 🛵'}
                  </h5>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {'الكباتن الواقفين في زون المطاعم بيجيلهم التنبيه الفوري بناءً على وقت استواء الأكل.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded-2xl transition-all">
                <span className="bg-orange-50 text-[#f94c10] p-1.5 rounded-xl font-bold text-xs font-mono">03</span>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">
                    {'شنط حرارية معزولة 🎒'}
                  </h5>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {'شنط الطيارين مقاومة للهواء ومحكمة تماماً للحفاظ على سخونة وجبتك لحد بابك.'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDeliveryModal(false)}
              className="w-full mt-6 bg-slate-900 hover:bg-slate-850 text-white rounded-xl py-2.5 text-xs font-bold cursor-pointer transition-all"
            >
              {'جامد جداً، فهمت'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
