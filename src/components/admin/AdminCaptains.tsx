import React from 'react';
import { supabaseConfigured, supabase } from '../../lib/supabase';

export default function AdminCaptains({ ctx }: { ctx: any }) {
  const { RestaurantMenuDropdown, aboutUsContentSetting, activeDishDropdownId, activeRestaurant, activeStoreDropdownId, adminEmail, adminLoginError, adminLoginLoading, adminPassword, adminTab, adminsList, aiError, aiLoading, aiWarning, captainLocations, captains, categoriesList, couponsList, currentAdmin, customInstructions, deleteConfirmAdminId, deleteConfirmDishId, deleteConfirmRestId, deliveryCommissionType, deliveryCommissionValue, deliveryOptions, deliveryPricingType, distanceBaseFee, distanceFeePerKm, dragActive, editingRestId, expandedCaptainReviews, extractedItems, fetchAdminsAndSettings, fetchCaptainsList, fileInputRef, fileName, handleAddCoupon, handleAddDeliveryOption, handleAddManualMenuItem, handleAdminLogin, handleAdminLogout, handleAdminRegister, handleCreateNewAdmin, handleDeleteAdmin, handleDeleteCaptain, handleDeleteCoupon, handleDeleteDeliveryOption, handleDeleteRestaurant, handleDrag, handleDrop, handleFileChange, handleFileParse, handleImportExtracted, handleSaveRestaurant, handleSaveSettings, handleScrollToRestaurantForm, handleSetEditRestaurant, handleSettingChange, handleToggleAdminPermission, handleToggleCoupon, handleUpdateAdminFlags, handleUpdateCaptainStatus, handleUpdateOrderCourierStatus, handleUpdateOrderFullStatus, isAdminRegisterMode, isAr, isCreatingRest, isUpdatingSettings, logoImageSetting, loyaltyCustomers, manualItemForm, newAdminForm, newCatIcon, newCatId, newCatName, newCatNameAr, newCouponCode, newCouponMinOrder, newCouponType, newCouponValue, newRegionFee, newRegionName, officeLat, officeLng, onBack, onNavigateCaptain, onRefreshData, ordersList, registerEmail, registerName, registerPassword, restForm, restaurants, reviews, rewardOrderThreshold, selectedFile, selectedImportItems, selectedRestId, setAboutUsContentSetting, setActiveDishDropdownId, setActiveStoreDropdownId, setAdminEmail, setAdminLoginError, setAdminLoginLoading, setAdminPassword, setAdminTab, setAdminsList, setAiError, setAiLoading, setAiWarning, setCaptainLocations, setCaptains, setCategoriesList, setCouponsList, setCurrentAdmin, setCustomInstructions, setDeleteConfirmAdminId, setDeleteConfirmDishId, setDeleteConfirmRestId, setDeliveryCommissionType, setDeliveryCommissionValue, setDeliveryOptions, setDeliveryPricingType, setDistanceBaseFee, setDistanceFeePerKm, setDragActive, setEditingRestId, setExpandedCaptainReviews, setExtractedItems, setFileName, setIsAdminRegisterMode, setIsCreatingRest, setIsUpdatingSettings, setLogoImageSetting, setLoyaltyCustomers, setManualItemForm, setNewAdminForm, setNewCatIcon, setNewCatId, setNewCatName, setNewCatNameAr, setNewCouponCode, setNewCouponMinOrder, setNewCouponType, setNewCouponValue, setNewRegionFee, setNewRegionName, setOfficeLat, setOfficeLng, setOrdersList, setRegisterEmail, setRegisterName, setRegisterPassword, setRestForm, setRewardOrderThreshold, setSelectedFile, setSelectedImportItems, setSelectedRestId, setSettingsExtra, setSuccessMsg, setWhatsappNumberSetting, settings, settingsExtra, successMsg, t, triggerSuccess, whatsappNumberSetting } = ctx;
  React.useEffect(() => {
    if (!supabaseConfigured) return;
    const channel = supabase.channel('admin-captain-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'captain_locations' }, payload => {
        const row: any = payload.new;
        setCaptainLocations((current: any[]) => {
          if (payload.eventType === 'DELETE') return current.filter(item => item.captainId !== payload.old.captain_id);
          const next = { captainId: row.captain_id, orderId: row.order_id, lat: Number(row.lat), lng: Number(row.lng), updatedAt: row.updated_at };
          return [...current.filter(item => item.captainId !== next.captainId), next];
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (<>
      {/* Tab 3: Captains directory and approvals */}
      {adminTab === 'captains' && (
        <div className="space-y-6">

          {/* ✅ خريطة مباشرة لمواقع الكباتن */}
          <div className="bg-white border border-slate-105 rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>📍</span>
                <span>مواقع الكباتن المباشرة</span>
              </h3>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { data: locs, error } = await supabase.from('captain_locations').select('*');
                    if (!error && locs) {
                      const mapped = locs.map((row: any) => ({ captainId: row.captain_id, orderId: row.order_id, lat: Number(row.lat), lng: Number(row.lng), updatedAt: row.updated_at }));
                      setCaptainLocations(mapped);
                      const mapDiv = document.getElementById('admin-captains-map');
                      if (!mapDiv) return;
                      const L = (window as any).L;
                      if (!L) return;
                      const map = (mapDiv as any)._leafletMap;
                      if (!map) return;
                      // امسح الماركرات القديمة
                      if ((mapDiv as any)._captainMarkers) {
                        (mapDiv as any)._captainMarkers.forEach((m: any) => m.remove());
                      }
                      (mapDiv as any)._captainMarkers = locs.map((loc: any) => {
                        const icon = (window as any).L.divIcon({ html: '<div style="font-size:22px">🛵</div>', className: '', iconAnchor: [11, 11] });
                        return L.marker([loc.lat, loc.lng], { icon })
                          .bindPopup(`<b>الطيار: ${loc.captainName || loc.captainId}</b><br>رقم الطلب: ${loc.orderId || 'لا يوجد طلب نشط'}<br>آخر تحديث: ${new Date(loc.updatedAt).toLocaleTimeString('ar')}`)
                          .addTo(map);
                      });
                      triggerSuccess(`تم تحديث ${locs.length} موقع كابتن 📍`);
                    }
                  } catch {}
                }}
                id="admin-refresh-locations"
                className="text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer"
              >
                🔄 تحديث المواقع
              </button>
            </div>
            <div
              id="admin-captains-map"
              className="relative z-0 isolate w-full rounded-2xl overflow-hidden border border-slate-200"
              style={{ height: '280px' }}
              ref={(el) => {
                if (!el || (el as any)._leaflet_id) return;
                const initAdminMap = () => {
                  const L = (window as any).L;
                  if (!L || (el as any)._leaflet_id) return;
                  const map = L.map('admin-captains-map', { zoomControl: true, attributionControl: false }).setView([30.0626, 31.2222], 12);
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                  (el as any)._leafletMap = map;
                  (el as any)._captainMarkers = [];
                };
                if ((window as any).L) {
                  initAdminMap();
                } else {
                  if (!document.querySelector('link[href*="leaflet"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(link);
                  }
                  if (!document.querySelector('script[src*="leaflet"]')) {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.onload = initAdminMap;
                    document.head.appendChild(script);
                  } else {
                    setTimeout(initAdminMap, 500);
                  }
                }
              }}
            />
            <p className="text-[9px] text-slate-400 mt-2 text-center">اضغط "تحديث المواقع" لجلب مواقع الكباتن النشطين الآن</p>
          </div>

          <div className="bg-white border border-slate-105 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <span>🛵</span>
              <span>حسابات كباتن التوصيل المسجلين</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              تحكم بطلبات تسجيل الكباتن والطيارين. الكابتن الجديد يسجل حسابًا ويدخل في حالة "قيد الانتظار" تلقائيًا. يجب على أحد الأدمنز الموافقة عليه وتفعيل حسابه أولاً ليتمكن من تسجيل الدخول والعمل واستلام الطلبات.
            </p>

            {captains.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold">
                لا يوجد كباتن مسجلين في قاعدة البيانات حالياً. يمكنك تسجيل كابتن جديد من واجهة تسجيل حساب.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {captains.map((cap: any) => {
                  const captainLocation = captainLocations.find((loc: any) => loc.captainId === cap.id);
                  const isPendingStatus = cap.status === 'pending';
                  const isSuspendedStatus = cap.status === 'suspended';
                  const isApprovedStatus = cap.status === 'approved';

                  return (
                    <div
                      key={cap.id}
                      className={`border rounded-2xl p-5 transition-all relative overflow-hidden bg-white shadow-xs ${isPendingStatus
                          ? 'border-amber-200 bg-amber-50/10'
                          : isSuspendedStatus
                            ? 'border-rose-150 bg-rose-50/5'
                            : 'border-slate-150 hover:border-slate-300'
                        }`}
                    >
                      <span className={`absolute top-0 right-0 left-0 h-1.5 ${isPendingStatus
                          ? 'bg-amber-400'
                          : isSuspendedStatus
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                        }`} />

                      <div className="space-y-4 pt-1.5 text-right">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-black text-slate-805">{cap.name}</h3>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5" style={{ direction: 'ltr' }}>{cap.phone}</p>
                            <p className={`text-[10px] font-bold mt-1 ${captainLocation ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {captainLocation ? `📍 متصل الآن · ${captainLocation.lat.toFixed(5)}, ${captainLocation.lng.toFixed(5)}` : '📍 الموقع غير متاح حاليًا'}
                            </p>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${isPendingStatus
                              ? 'bg-amber-100 text-amber-800'
                              : isSuspendedStatus
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-105 text-green-800'
                            }`}>
                            {isPendingStatus && '⏳ قيد الانتظار والموافقة'}
                            {isSuspendedStatus && '🚫 موقوف مؤقتاً'}
                            {isApprovedStatus && '🟢 حساب نشط وعملي'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1 font-semibold">
                          <p><strong>طبيعة الحساب:</strong> كابتن توصيل دليفري 🛵</p>
                          {cap.email && <p className="truncate"><strong>البريد:</strong> {cap.email}</p>}
                        </div>

                        {(() => {
                          const capReviews = reviews ? reviews.filter((r) => r.courierName === cap.name) : [];
                          const avgSpeed = capReviews.length > 0
                            ? Number((capReviews.reduce((sum, r) => sum + (r.ratingDeliverySpeed || 5), 0) / capReviews.length).toFixed(1))
                            : 5.0;
                          const avgManner = capReviews.length > 0
                            ? Number((capReviews.reduce((sum, r) => sum + (r.ratingDeliveryManner || 5), 0) / capReviews.length).toFixed(1))
                            : 5.0;
                          return (
                            <div className="bg-slate-50 rounded-xl p-3 text-[11px] font-bold text-slate-700 space-y-1 border border-slate-100">
                              <p className="text-[10px] text-slate-400 font-extrabold uppercase">📊 تقييمات الأداء والعملاء ({capReviews.length}):</p>
                              <div className="flex justify-between items-center">
                                <span>⚡ سرعة التوصيل:</span>
                                <span className="font-mono bg-amber-55/75 text-amber-900 rounded-md px-1.5 py-0.5 border border-amber-100 flex items-center gap-1">
                                  ⭐ {avgSpeed} / 5
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>🤝 الأسلوب والتعامل:</span>
                                <span className="font-mono bg-amber-55/75 text-amber-900 rounded-md px-1.5 py-0.5 border border-amber-100 flex items-center gap-1">
                                  ⭐ {avgManner} / 5
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {expandedCaptainReviews === cap.id && (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-right space-y-2">
                            <p className="text-[11px] font-black text-indigo-800">آراء العملاء خلال آخر ٧ أيام</p>
                            {(() => {
                              const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
                              const recent = (reviews || []).filter(r => r.courierId === cap.id || r.courierName === cap.name).filter(r => {
                                const time = Date.parse(r.createdAt || '');
                                return Number.isFinite(time) && time >= since;
                              });
                              return recent.length ? recent.map(r => (
                                <div key={r.id} className="bg-white rounded-lg p-2 text-[10px] text-slate-700 border border-indigo-100">
                                  <div className="flex justify-between gap-2 font-bold"><span>{r.customerName}</span><span>⭐ {r.ratingDeliveryManner || 0} · ⚡ {r.ratingDeliverySpeed || 0}</span></div>
                                  <p className="mt-1">{r.comment || 'بدون تعليق'}</p>
                                </div>
                              )) : <p className="text-[10px] text-slate-500">لا توجد آراء مسجلة لهذا الطيار خلال آخر ٧ أيام.</p>;
                            })()}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                          {isPendingStatus && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCaptainStatus(cap.id, 'approved')}
                              className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl py-2 text-xs transition-all shadow-sm cursor-pointer"
                            >
                              ✅ موافقة وتنشيط الحساب
                            </button>
                          )}

                          {isApprovedStatus && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCaptainStatus(cap.id, 'suspended')}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl py-2 text-xs transition-all cursor-pointer"
                            >
                              🚫 إيقاف الحساب
                            </button>
                          )}

                          {isApprovedStatus && onNavigateCaptain && (
                            <button
                              type="button"
                              onClick={() => onNavigateCaptain()}
                              className="bg-[#f94c10] hover:bg-orange-600 text-white font-bold rounded-xl py-2 text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              🛵 فتح واجهة الكابتن
                            </button>
                          )}

                          {isSuspendedStatus && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCaptainStatus(cap.id, 'approved')}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-2 text-xs transition-all cursor-pointer"
                            >
                              🟢 إعادة تنشيط
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedCaptainReviews(expandedCaptainReviews === cap.id ? null : cap.id)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl py-2 text-xs transition-all cursor-pointer"
                          >
                            💬 آراء آخر ٧ أيام
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCaptain(cap.id, cap.name)}
                            disabled={!isApprovedStatus && !isPendingStatus && !isSuspendedStatus}
                            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-red-50 hover:bg-red-100 text-red-750 flex items-center justify-center gap-1.5 ${isPendingStatus ? 'col-span-2' : ''
                              }`}
                          >
                            <span>🗑️</span>
                            <span>حذف كلي</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}
