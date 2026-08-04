import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import AdminLoyalty from './AdminLoyalty';
import AdminCategories from './AdminCategories';
import { uploadImageFile } from '../../utils/imageUpload';

export default function AdminSettings({ ctx }: { ctx: any }) {
  const { RestaurantMenuDropdown, aboutUsContentSetting, activeDishDropdownId, activeRestaurant, activeStoreDropdownId, adminEmail, adminLoginError, adminLoginLoading, adminPassword, adminTab, adminsList, aiError, aiLoading, aiWarning, captainLocations, captains, categoriesList, couponsList, currentAdmin, customInstructions, deleteConfirmAdminId, deleteConfirmDishId, deleteConfirmRestId, deliveryCommissionType, deliveryCommissionValue, deliveryOptions, deliveryPricingType, distanceBaseFee, distanceFeePerKm, dragActive, editingRestId, expandedCaptainReviews, extractedItems, fetchAdminsAndSettings, fetchCaptainsList, fileInputRef, fileName, handleAddCoupon, handleAddDeliveryOption, handleAddManualMenuItem, handleAdminLogin, handleAdminLogout, handleAdminRegister, handleCreateNewAdmin, handleDeleteAdmin, handleDeleteCaptain, handleDeleteCoupon, handleDeleteDeliveryOption, handleDeleteRestaurant, handleDrag, handleDrop, handleFileChange, handleFileParse, handleImportExtracted, handleSaveRestaurant, handleSaveSettings, handleScrollToRestaurantForm, handleSetEditRestaurant, handleSettingChange, handleToggleAdminPermission, handleToggleCoupon, handleUpdateAdminFlags, handleUpdateCaptainStatus, handleUpdateOrderCourierStatus, handleUpdateOrderFullStatus, isAdminRegisterMode, isAr, isCreatingRest, isUpdatingSettings, logoImageSetting, loyaltyCustomers, manualItemForm, newAdminForm, newCatIcon, newCatId, newCatName, newCatNameAr, newCouponCode, newCouponMinOrder, newCouponType, newCouponValue, newRegionFee, newRegionName, officeLat, officeLng, ordersList, registerEmail, registerName, registerPassword, restForm, rewardOrderThreshold, selectedFile, selectedImportItems, selectedRestId, setAboutUsContentSetting, setActiveDishDropdownId, setActiveStoreDropdownId, setAdminEmail, setAdminLoginError, setAdminLoginLoading, setAdminPassword, setAdminTab, setAdminsList, setAiError, setAiLoading, setAiWarning, setCaptainLocations, setCaptains, setCategoriesList, setCouponsList, setCurrentAdmin, setCustomInstructions, setDeleteConfirmAdminId, setDeleteConfirmDishId, setDeleteConfirmRestId, setDeliveryCommissionType, setDeliveryCommissionValue, setDeliveryOptions, setDeliveryPricingType, setDistanceBaseFee, setDistanceFeePerKm, setDragActive, setEditingRestId, setExpandedCaptainReviews, setExtractedItems, setFileName, setIsAdminRegisterMode, setIsCreatingRest, setIsUpdatingSettings, setLogoImageSetting, setLoyaltyCustomers, setManualItemForm, setNewAdminForm, setNewCatIcon, setNewCatId, setNewCatName, setNewCatNameAr, setNewCouponCode, setNewCouponMinOrder, setNewCouponType, setNewCouponValue, setNewRegionFee, setNewRegionName, setOfficeLat, setOfficeLng, setOrdersList, setRegisterEmail, setRegisterName, setRegisterPassword, setRestForm, setRewardOrderThreshold, setSelectedFile, setSelectedImportItems, setSelectedRestId, setSettingsExtra, setSuccessMsg, setWhatsappNumberSetting, settings, settingsExtra, successMsg, t, triggerSuccess, whatsappNumberSetting, restaurants, onBack, onRefreshData, onAdminLogin, onAdminLogout, reviews } = ctx;
  return <>
      {adminTab === 'settings' && (
        <div className="space-y-6">
          <AdminLoyalty
            rewardOrderThreshold={rewardOrderThreshold}
            setRewardOrderThreshold={setRewardOrderThreshold}
            loyaltyCustomers={loyaltyCustomers}
            onSuccess={triggerSuccess}
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
                <span>{isAr ? "إدارة مناطق التوصيل والأسعار" : "Delivery Regions & Fees"}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? "قم بتسجيل وتعديل الأحياء السكنية والبلاد المتاحة للتوصيل مع تحديد السعر الخاص بكل منطقة."
                  : "Register neighborhoods, zones or cities available for delivery along with their custom delivery fee."}
              </p>

              <form
                onSubmit={handleAddDeliveryOption}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>➕</span>
                  <span>{isAr ? "تسجيل منطقة توصيل جديدة" : "Add New Delivery Zone"}</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? "اسم المنطقة (بالكامل)" : "Region Name"}</label>
                    <input
                      required
                      type="text"
                      value={newRegionName}
                      onChange={(e) => setNewRegionName(e.target.value)}
                      placeholder={isAr ? "مثال: المعادي" : "e.g., Maadi"}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? "سعر التوصيل (ج.م)" : "Delivery Fee (EGP)"}</label>
                    <input
                      required
                      type="number"
                      value={newRegionFee}
                      onChange={(e) => setNewRegionFee(e.target.value)}
                      placeholder="e.g., 20"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] text-white rounded-xl py-2 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {isAr ? "حفظ وتسجيل المنطقة" : "Save Region"}
                </button>
              </form>

              <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {isAr ? `المناطق المسجلة (${deliveryOptions.length})` : `Registered Areas (${deliveryOptions.length})`}
                </h3>
                {deliveryOptions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {isAr ? "لا يوجد مناطق مسجلة بعد" : "No regions registered yet"}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                    {deliveryOptions.map((opt) => (
                      <div key={opt.id} className="p-3 hover:bg-slate-50 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{opt.name}</span>
                          <span className="text-slate-300">|</span>
                          <span className="font-semibold text-emerald-600">{opt.fee} {isAr ? "ج.م توصيل" : "EGP Fee"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeliveryOption(opt.id, opt.name)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                          title={isAr ? "حذف المنطقة" : "Delete Region"}
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
                <span>{isAr ? "إدارة وتفعيل كوبونات الخصم" : "Discount Coupons Manager"}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? "تحكم بالكوبونات المتوفرة للتطبيق. قم بتفعيل أو تعطيل الكوبونات وسيقوم المستخدم بإدخالها يدوياً."
                  : "Create discount codes. Toggle activation on/off. Users must enter these codes manually inside checkout."}
              </p>

              <form
                onSubmit={handleAddCoupon}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>➕</span>
                  <span>{isAr ? "إضافة كوبون خصم جديد" : "Create New Promo Code"}</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? "رمز الكوبون" : "Coupon Code"}</label>
                    <input
                      required
                      type="text"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="e.g., MEGA20"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none uppercase font-mono text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? "نوع الخصم" : "Discount Type"}</label>
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800 font-medium"
                    >
                      <option value="percentage">{isAr ? "نسبة مئوية (%)" : "Percentage (%)"}</option>
                      <option value="flat">{isAr ? "قيمة ثابتة (ج.م)" : "Flat Cash (EGP)"}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? "قيمة الخصم" : "Discount Amount"}</label>
                    <input
                      required
                      type="number"
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(e.target.value)}
                      placeholder="e.g., 20"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? "الحد الأدنى للطلب (ج.م)" : "Min Order (EGP)"}</label>
                    <input
                      type="number"
                      value={newCouponMinOrder}
                      onChange={(e) => setNewCouponMinOrder(e.target.value)}
                      placeholder="e.g., 100"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-800"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#f94c10] hover:bg-[#d83f0c] hover:scale-[1.01] active:scale-[0.99] text-white rounded-xl py-2 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {isAr ? "توليد وإدراج الكوبون" : "Publish Coupon"}
                </button>
              </form>

              <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {isAr ? `الكوبونات المتوفرة (${couponsList.length})` : `Available Coupons (${couponsList.length})`}
                </h3>
                {couponsList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {isAr ? "لا يوجد كوبونات مسجلة" : "No coupons published yet"}
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
                              {cp.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "معطل" : "Disabled")}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            <span>
                              {isAr ? "خصم: " : "Discount: "}
                              <strong className="text-slate-700">{cp.discountValue}{cp.discountType === 'percentage' ? '%' : ' ج.م'}</strong>
                            </span>
                            {cp.minOrder > 0 && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{isAr ? "حد أدنى: " : "Min: "} <strong className="text-slate-750">{cp.minOrder} ج.م</strong></span>
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
                            {cp.isActive ? (isAr ? "تعطيل" : "Disable") : (isAr ? "تفعيل" : "Enable")}
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
              <span>{isAr ? "إعدادات قواعد الشحن العامة والطلب" : "Global Order & Pricing Settings"}</span>
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">{isAr ? "رقم الواتساب لاستقبال الطلبات" : "WhatsApp Order Receiver Number"}</label>
                  <input
                    type="text"
                    value={whatsappNumberSetting}
                    onChange={(e) => setWhatsappNumberSetting(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2 text-xs font-medium outline-none text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">{isAr ? "مثال: 201016789012 (مع كود الدولة وبدون علامة +)" : "e.g., 201016789012 (with country code, no +)"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">{isAr ? "لوجو التطبيق من الجهاز" : "App Logo from Device"}</label>
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
                      <img src={logoImageSetting} alt={isAr ? 'شعار التطبيق' : 'App logo preview'} className="w-full h-auto object-contain" />
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">{isAr ? "اختر صورة من جهازك لتظهر كلوجو التطبيق" : "Choose a device image to use as the app logo."}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">{isAr ? "نوع حساب تسعير التوصيل" : "Delivery Pricing Engine"}</label>
                  <select
                    value={deliveryPricingType}
                    onChange={(e) => setDeliveryPricingType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2 text-xs font-medium outline-none text-slate-800"
                  >
                    <option value="area">{isAr ? "حسب المنطقة الجغرافية (توصيل مخصّص)" : "By Geographical Area (Custom fees)"}</option>
                    <option value="distance">{isAr ? "حسب المسافة بالكيلومتر (توصيل تلقائي)" : "By GPS Distance (Automatic distance calculation)"}</option>
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
                      <span>{isAr ? "جاري التحديث..." : "Updating Settings..."}</span>
                    </>
                  ) : (
                    <span>{isAr ? "حفظ الإعدادات بالكامل" : "Save Settings"}</span>
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
