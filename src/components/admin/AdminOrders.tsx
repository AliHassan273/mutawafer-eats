import React from 'react';

export default function AdminOrders({ ctx }: { ctx: any }) {
  const { RestaurantMenuDropdown, aboutUsContentSetting, activeDishDropdownId, activeRestaurant, activeStoreDropdownId, adminEmail, adminLoginError, adminLoginLoading, adminPassword, adminTab, adminsList, aiError, aiLoading, aiWarning, captainLocations, captains, categoriesList, couponsList, currentAdmin, customInstructions, deleteConfirmAdminId, deleteConfirmDishId, deleteConfirmRestId, deliveryCommissionType, deliveryCommissionValue, deliveryOptions, deliveryPricingType, distanceBaseFee, distanceFeePerKm, dragActive, editingRestId, expandedCaptainReviews, extractedItems, fetchAdminsAndSettings, fetchCaptainsList, fileInputRef, fileName, handleAddCoupon, handleAddDeliveryOption, handleAddManualMenuItem, handleAdminLogin, handleAdminLogout, handleAdminRegister, handleCreateNewAdmin, handleDeleteAdmin, handleDeleteCaptain, handleDeleteCoupon, handleDeleteDeliveryOption, handleDeleteRestaurant, handleDrag, handleDrop, handleFileChange, handleFileParse, handleImportExtracted, handleSaveRestaurant, handleSaveSettings, handleScrollToRestaurantForm, handleSetEditRestaurant, handleSettingChange, handleToggleAdminPermission, handleToggleCoupon, handleUpdateAdminFlags, handleUpdateCaptainStatus, handleUpdateOrderCourierStatus, handleUpdateOrderFullStatus, isAdminRegisterMode, isAr, isCreatingRest, isUpdatingSettings, logoImageSetting, loyaltyCustomers, manualItemForm, newAdminForm, newCatIcon, newCatId, newCatName, newCatNameAr, newCouponCode, newCouponMinOrder, newCouponType, newCouponValue, newRegionFee, newRegionName, officeLat, officeLng, onBack, onRefreshData, ordersList, registerEmail, registerName, registerPassword, restForm, restaurants, reviews, rewardOrderThreshold, selectedFile, selectedImportItems, selectedRestId, setAboutUsContentSetting, setActiveDishDropdownId, setActiveStoreDropdownId, setAdminEmail, setAdminLoginError, setAdminLoginLoading, setAdminPassword, setAdminTab, setAdminsList, setAiError, setAiLoading, setAiWarning, setCaptainLocations, setCaptains, setCategoriesList, setCouponsList, setCurrentAdmin, setCustomInstructions, setDeleteConfirmAdminId, setDeleteConfirmDishId, setDeleteConfirmRestId, setDeliveryCommissionType, setDeliveryCommissionValue, setDeliveryOptions, setDeliveryPricingType, setDistanceBaseFee, setDistanceFeePerKm, setDragActive, setEditingRestId, setExpandedCaptainReviews, setExtractedItems, setFileName, setIsAdminRegisterMode, setIsCreatingRest, setIsUpdatingSettings, setLogoImageSetting, setLoyaltyCustomers, setManualItemForm, setNewAdminForm, setNewCatIcon, setNewCatId, setNewCatName, setNewCatNameAr, setNewCouponCode, setNewCouponMinOrder, setNewCouponType, setNewCouponValue, setNewRegionFee, setNewRegionName, setOfficeLat, setOfficeLng, setOrdersList, setRegisterEmail, setRegisterName, setRegisterPassword, setRestForm, setRewardOrderThreshold, setSelectedFile, setSelectedImportItems, setSelectedRestId, setSettingsExtra, setSuccessMsg, setWhatsappNumberSetting, settings, settingsExtra, successMsg, t, triggerSuccess, whatsappNumberSetting } = ctx;
  return <>
      {/* Tab 2: Orders Approved/Live Tracking Dashboard */}
      {adminTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <span>📦</span>
              <span>{'موافقة وإشراف الطلبات المعلقة'}</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {'تحكم في سريان الطلبات: العميل عندما يطلب يتحول طلبه أولاً لحالة "معلق بالإدارة" ويتم التوجيه للواتساب، لتقوم بقبولها من هنا وتمريرها للمطابخ وتعيين كابتن توصيل نشط!'}
            </p>

            {ordersList.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold">
                {'لا يوجد أي طلبات مسجلة في التطبيق حالياً!'}
              </div>
            ) : (
              <div className="space-y-4">
                {ordersList.map((order: any) => {
                  const isPending = order.status === 'Pending';
                  const isDelivered = order.status === 'Delivered';

                  return (
                    <div
                      key={order.id}
                      className={`border rounded-3xl p-5 bg-white transition-all shadow-xs ${isPending
                          ? 'border-amber-200 bg-amber-50/15 animate-pulse-subtle'
                          : isDelivered
                            ? 'border-slate-100 bg-slate-50/50 opacity-85'
                            : 'border-sky-100'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-dashed border-slate-200 pb-3 mb-3.5">
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-slate-400">
                            #{order.id.toUpperCase()} • {order.createdAt}
                          </p>
                          <h4 className="text-sm font-black text-slate-805">
                            {order.restaurant?.name || 'المطعم'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-850 border border-sky-200'
                            }`}>
                            {order.status === 'Pending' && ('⏳ قيد مراجعة وموافقة المدير')}
                            {order.status === 'Received' && ('👍 تم القبول (بانتظار المطبخ)')}
                            {order.status === 'Preparing' && ('👨‍🍳 يطبخ حالياً بالمطبخ')}
                            {order.status === 'OutForDelivery' && ('🛵 في الطريق مع الطيار')}
                            {order.status === 'Delivered' && ('🥰 تم التوصيل للعميل')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-650 leading-relaxed">
                        <div className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
                          <p className="font-extrabold text-slate-800 mb-2 border-b border-slate-100 pb-1">🍕 الأصناف والوجبات:</p>
                          <ul className="space-y-1">
                            {(order.items || []).map((item: any, idx: number) => {
                              const sizeLabel = item.selectedSize ? ` (${item.selectedSize.name})` : '';
                              const effectivePrice = item.selectedSize ? item.selectedSize.price : item.menuItem.price;
                              return (
                                <li key={idx} className="font-semibold text-slate-700 flex justify-between items-center">
                                  <span>- {item.menuItem.name}{sizeLabel} {item.quantity > 1 ? `(×${item.quantity})` : ''}</span>
                                  <span className="font-mono text-slate-450">{effectivePrice * item.quantity} ج</span>
                                </li>
                              );
                            })}
                          </ul>
                          <div className="border-t border-slate-200 mt-2.5 pt-2 flex justify-between font-extrabold text-slate-900">
                            <span>الحساب الإجمالي:</span>
                            <span className="font-mono text-[#f94c10]">{order.total} جنيه</span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
                          <p className="font-extrabold text-slate-800 mb-2 border-b border-slate-100 pb-1">👤 تفاصيل العميل:</p>
                          <p className="font-semibold"><strong>الاسم:</strong> {order.customerName}</p>
                          <p className="font-mono mt-1"><strong>رقم الهاتف:</strong> {order.customerPhone}</p>
                          <p className="mt-1"><strong>العنوان:</strong> {order.deliveryAddress}</p>
                        </div>

                        <div className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
                          <p className="font-extrabold text-slate-800 mb-2 border-b border-slate-100 pb-1">🛵 كابتن التوصيل المعيَّن:</p>
                          {order.courierName ? (
                            <div className="space-y-1">
                              <p className="font-bold text-slate-805">🛵 الكابتن: {order.courierName}</p>
                              <p className="font-mono text-slate-500">رقم التواصل: {order.courierPhone}</p>
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">لا يوجد كابتن معين لهذا الطلب حتى الآن.</p>
                          )}
                          <p className="mt-3 text-[10px] text-slate-500 line-clamp-2"><strong>ملاحظات العميل:</strong> {order.notes || "لا يوجد"}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap gap-2 justify-end items-center">
                        <button
                          type="button"
                          onClick={() => {
                            const customMsg = `مرحبًا يا كابتن ${order.customerName}، تواصل من إدارة مسافر إيتس بخصوص طلبك #${order.id.toUpperCase()}`;
                            window.open(`https://wa.me/${String(order.customerPhone).replace('+', '')}?text=${encodeURIComponent(customMsg)}`, '_blank');
                          }}
                          className="bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-extrabold rounded-xl py-2 px-4 text-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>💬</span>
                          <span>مراسلة العميل</span>
                        </button>

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderFullStatus(order.id, { status: 'Received' })}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl py-2 px-5 text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                          >
                            <span>👨‍🍳</span>
                            <span>قبول الطلب وإرساله للمطبخ</span>
                          </button>
                        )}

                        {order.status === 'Received' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderFullStatus(order.id, { status: 'Preparing' })}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl py-2 px-5 text-xs transition-all cursor-pointer shadow-sm"
                          >
                            🍽️ البدء في الطبخ بالمطبخ
                          </button>
                        )}

                        {order.status === 'Preparing' && (
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-wrap">
                            <span className="text-[10px] font-black text-slate-500">تعيين الكابتن للتوصيل:</span>
                            <select
                              onChange={(e) => {
                                if (!e.target.value) return;
                                const parsed = JSON.parse(e.target.value);
                                handleUpdateOrderFullStatus(order.id, {
                                  courierName: parsed.name,
                                  courierPhone: parsed.phone,
                                  status: 'OutForDelivery'
                                });
                              }}
                              className="bg-white border border-slate-205 text-[11px] font-bold rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-orange-500"
                            >
                              <option value="">-- اختر كابتن توصيل معتمد --</option>
                              {currentAdmin && (
                                <option value={JSON.stringify({ name: currentAdmin.name, phone: currentAdmin.phone || '01016789012' })}>
                                  👑 نفسي ({currentAdmin.name} - الآدمن الحالي)
                                </option>
                              )}
                              {adminsList.filter(a => a.id !== currentAdmin?.id).map((admin: any) => (
                                <option key={`admin-select-${admin.id}`} value={JSON.stringify({ name: admin.name, phone: admin.phone || '01012345678' })}>
                                  👑 {admin.name} (مشرف)
                                </option>
                              ))}
                              {captains.filter(c => c.status === 'approved').map((cap: any) => (
                                <option key={cap.id} value={JSON.stringify({ name: cap.name, phone: cap.phone })}>
                                  🛵 {cap.name} ({cap.phone})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {order.status === 'OutForDelivery' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderFullStatus(order.id, { status: 'Delivered' })}
                            className="bg-green-605 hover:bg-green-700 text-white font-extrabold rounded-xl py-2 px-5 text-xs transition-all cursor-pointer shadow-sm"
                          >
                            ✅ تأكيد تمام الوصول للعميل وتسليم الوجبات
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

  </>;
}
