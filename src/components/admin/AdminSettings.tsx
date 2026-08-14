import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import AdminLoyalty from './AdminLoyalty';
import AdminCategories from './AdminCategories';
import { uploadImageFile } from '../../utils/imageUpload';

export default function AdminSettings({ ctx }: { ctx: any }) {
  const { RestaurantMenuDropdown, aboutUsContentSetting, activeDishDropdownId, activeRestaurant, activeStoreDropdownId, adminEmail, adminLoginError, adminLoginLoading, adminPassword, adminTab, adminsList, aiError, aiLoading, aiWarning, captainLocations, captains, categoriesList, couponsList, currentAdmin, customInstructions, deleteConfirmAdminId, deleteConfirmDishId, deleteConfirmRestId, deliveryCommissionType, deliveryCommissionValue, deliveryOptions, deliveryPricingType, distanceBaseFee, distanceFeePerKm, dragActive, editingRestId, expandedCaptainReviews, extractedItems, fetchAdminsAndSettings, fetchCaptainsList, fileInputRef, fileName, handleAddCoupon, handleAddDeliveryOption, handleAddManualMenuItem, handleAdminLogin, handleAdminLogout, handleAdminRegister, handleCreateNewAdmin, handleDeleteAdmin, handleDeleteCaptain, handleDeleteCoupon, handleDeleteDeliveryOption, handleDeleteRestaurant, handleDrag, handleDrop, handleFileChange, handleFileParse, handleImportExtracted, handleSaveRestaurant, handleSaveSettings, handleScrollToRestaurantForm, handleSetEditRestaurant, handleSettingChange, handleToggleAdminPermission, handleToggleCoupon, handleUpdateAdminFlags, handleUpdateCaptainStatus, handleUpdateOrderCourierStatus, handleUpdateOrderFullStatus, isAdminRegisterMode, isAr, isCreatingRest, isUpdatingSettings, logoImageSetting, loyaltyCustomers, manualItemForm, newAdminForm, newCatIcon, newCatId, newCatName, newCatNameAr, newCouponCode, newCouponMinOrder, newCouponType, newCouponValue, newRegionFee, newRegionName, officeLat, officeLng, ordersList, registerEmail, registerName, registerPassword, restForm, rewardOrderThreshold, selectedFile, selectedImportItems, selectedRestId, setAboutUsContentSetting, setActiveDishDropdownId, setActiveStoreDropdownId, setAdminEmail, setAdminLoginError, setAdminLoginLoading, setAdminPassword, setAdminTab, setAdminsList, setAiError, setAiLoading, setAiWarning, setCaptainLocations, setCaptains, setCategoriesList, setCouponsList, setCurrentAdmin, setCustomInstructions, setDeleteConfirmAdminId, setDeleteConfirmDishId, setDeleteConfirmRestId, setDeliveryCommissionType, setDeliveryCommissionValue, setDeliveryOptions, setDeliveryPricingType, setDistanceBaseFee, setDistanceFeePerKm, setDragActive, setEditingRestId, setExpandedCaptainReviews, setExtractedItems, setFileName, setIsAdminRegisterMode, setIsCreatingRest, setIsUpdatingSettings, setLogoImageSetting, setLoyaltyCustomers, setManualItemForm, setNewAdminForm, setNewCatIcon, setNewCatId, setNewCatName, setNewCatNameAr, setNewCouponCode, setNewCouponMinOrder, setNewCouponType, setNewCouponValue, setNewRegionFee, setNewRegionName, setOfficeLat, setOfficeLng, setOrdersList, setRegisterEmail, setRegisterName, setRegisterPassword, setRestForm, setRewardOrderThreshold, setSelectedFile, setSelectedImportItems, setSelectedRestId, setSettingsExtra, setSuccessMsg, setWhatsappNumberSetting, settings, settingsExtra, successMsg, t, triggerSuccess, whatsappNumberSetting, restaurants, onBack, onRefreshData, onAdminLogin, onAdminLogout, reviews, refreshAdminPage, onDeleteCategory } = ctx;
  return <>
      {adminTab === 'settings' && (
        <div className="space-y-6">
          <AdminLoyalty
            rewardOrderThreshold={rewardOrderThreshold}
            setRewardOrderThreshold={setRewardOrderThreshold}
            loyaltyCustomers={loyaltyCustomers}
            onSuccess={triggerSuccess}
            onRefresh={refreshAdminPage}
            onDeleteCategory={onDeleteCategory}
          />
          <AdminCategories
            categories={categoriesList}
            setCategories={setCategoriesList}
            newId={newCatId}
            setNewId={setNewCatId}
            newNameAr={newCatNameAr}
            setNewNameAr={setNewCatNameAr}
            newIcon={newCatIcon}
            setNewIcon={setNewCatIcon}
            onSuccess={triggerSuccess}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white border border-slate-105 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                <span>📍</span>
                <span>{"إدارة مناطق التوصيل والأسعار"}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {"قم بتسجيل وتعديل الأحياء السكنية والبلاد المتاحة للتوصيل مع تحديد السعر الخاص بكل منطقة."}
              </p>

              <form
                onSubmit={handleAddDeliveryOption}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>➕</span>
                  <span>{"تسجيل منطقة توصيل جديدة"}</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{"اسم المنطقة (بالكامل)"}</label>
                    <input
                      required
                      type="text"
                      value={newRegionName}
                      onChange={(e) => setNewRegionName(e.target.value)}
                      placeholder={"مثال: المعادي"}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{"سعر التوصيل (ج.م)"}</label>
                    <input
                      required
                      type="number"
                      value={newRegionFee}
                      onChange={(e) => setNewRegionFee(e.target.value)}
                      placeholder="مثال: 20"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] text-white rounded-xl py-2 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {"حفظ وتسجيل المنطقة"}
                </button>
              </form>

              <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {`المناطق المسجلة (${deliveryOptions.length})`}
                </h3>
                {deliveryOptions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {"لا يوجد مناطق مسجلة بعد"}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                    {deliveryOptions.map((opt) => (
                      <div key={opt.id} className="p-3 hover:bg-slate-50 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{opt.name}</span>
                          <span className="text-slate-300">|</span>
                          <span className="font-semibold text-emerald-600">{opt.fee} {"ج.م توصيل"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeliveryOption(opt.id, opt.name)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                          title={"حذف المنطقة"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-105 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                <span>🏷️</span>
                <span>{"إدارة وتفعيل كوبونات الخصم"}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {"تحكم بالكوبونات المتوفرة للتطبيق. قم بتفعيل أو تعطيل الكوبونات وسيقوم المستخدم بإدخالها يدوياً."}
              </p>

              <form
                onSubmit={handleAddCoupon}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>➕</span>
                  <span>{"إضافة كوبون خصم جديد"}</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{"رمز الكوبون"}</label>
                    <input
                      required
                      type="text"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="مثال: MEGA20"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none uppercase font-mono text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{"نوع الخصم"}</label>
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800 font-medium"
                    >
                      <option value="percentage">{"نسبة مئوية (%)"}</option>
                      <option value="flat">{"قيمة ثابتة (ج.م)"}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{"قيمة الخصم"}</label>
                    <input
                      required
                      type="number"
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(e.target.value)}
                      placeholder="مثال: 20"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{"الحد الأدنى للطلب (ج.م)"}</label>
                    <input
                      type="number"
                      value={newCouponMinOrder}
                      onChange={(e) => setNewCouponMinOrder(e.target.value)}
                      placeholder="مثال: 100"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#f94c10] hover:bg-[#d83f0c] hover:scale-[1.01] active:scale-[0.99] text-white rounded-xl py-2 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {"توليد وإدراج الكوبون"}
                </button>
              </form>

              <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {`الكوبونات المتوفرة (${couponsList.length})`}
                </h3>
                {couponsList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {"لا يوجد كوبونات مسجلة"}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                    {couponsList.map((cp) => (
                      <div key={cp.id} className="p-3 hover:bg-slate-50 flex justify-between items-center text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-950 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] uppercase tracking-wider">{cp.code}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${cp.isActive
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                              }`}>
                              {cp.isActive ? ("نشط") : ("معطل")}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            <span>
                              {"خصم: "}
                              <strong className="text-slate-700">{cp.discountValue}{cp.discountType === 'percentage' ? '%' : ' ج.م'}</strong>
                            </span>
                            {cp.minOrder > 0 && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{"حد أدنى: "} <strong className="text-slate-750">{cp.minOrder} ج.م</strong></span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(cp.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${cp.isActive
                                ? "bg-slate-105 hover:bg-slate-200 text-slate-600"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                              }`}
                          >
                            {cp.isActive ? ("تعطيل") : ("تفعيل")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(cp.id, cp.code)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="bg-white border border-slate-105 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <span>⚙️</span>
              <span>{"إعدادات قواعد الشحن العامة والطلب"}</span>
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">{"رقم الواتساب لاستقبال الطلبات"}</label>
                  <input
                    type="text"
                    value={whatsappNumberSetting}
                    onChange={(e) => setWhatsappNumberSetting(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2 text-xs font-medium outline-none text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">{"مثال: 201016789012 (مع كود الدولة وبدون علامة +)"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">{"لوجو التطبيق من الجهاز"}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadImageFile(file).then(url => setLogoImageSetting(url)).catch(err => triggerSuccess(err.message));
                      }
                    }}
                    className="w-full text-xs font-medium text-slate-700"
                  />
                  {logoImageSetting ? (
                    <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 shadow-sm w-full max-w-xs">
                      <img src={logoImageSetting} alt={'شعار التطبيق'} className="w-full h-auto object-contain" />
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">{"اختر صورة من جهازك لتظهر كلوجو التطبيق"}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">{"نوع حساب تسعير التوصيل"}</label>
                  <select
                    value={deliveryPricingType}
                    onChange={(e) => setDeliveryPricingType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2 text-xs font-medium outline-none text-slate-800"
                  >
                    <option value="area">{"حسب المنطقة الجغرافية (توصيل مخصّص)"}</option>
                    <option value="distance">{"حسب المسافة بالكيلومتر (توصيل تلقائي)"}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-50">
                <button
                  type="submit"
                  disabled={isUpdatingSettings}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isUpdatingSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>{"جاري التحديث..."}</span>
                    </>
                  ) : (
                    <span>{"حفظ الإعدادات بالكامل"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modals */}
  </>;
}
