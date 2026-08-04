import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  Building2, Plus, Trash2, Edit2, Upload, Sparkles, Check,
  AlertCircle, ArrowLeft, Loader2, DollarSign, Tag, ClipboardList,
  MoreVertical
} from "lucide-react";
import { Restaurant, MenuItem, Review } from "../types";
import { fetchWithRetry } from "../utils/fetchHelper";
import { uploadImageFile } from '../utils/imageUpload';
import { saveToken } from '../utils/fetchHelper';
import { lang } from '../translations';
import AdminCategories from '../components/admin/AdminCategories';
import AdminLoyalty from '../components/admin/AdminLoyalty';
import AdminPermissions from '../components/admin/AdminPermissions';
import AdminSettings from '../components/admin/AdminSettings';
import AdminStatistics from '../components/admin/AdminStatistics';
import { supabaseConfigured, supabase } from '../lib/supabase';
import { signInWithSupabase } from '../services/supabaseAuthService';
import { saveRestaurantInSupabase, deleteRestaurantInSupabase, listAdminOrdersFromSupabase, listCaptainsFromSupabase, listAdminProfilesFromSupabase, updateProfilePermissionsInSupabase, updateCaptainStatusInSupabase, createAdminInSupabase, deleteAdminInSupabase, listLoyaltyCustomersFromSupabase, deleteCaptainInSupabase } from '../services/supabaseAdminService';
import { saveSettingsToSupabase, getSettingsFromSupabase } from '../services/supabaseSettingsService';
import { updateOrderStatusInSupabase } from '../services/supabaseOrderService';
import { addMenuItemsToSupabase } from '../services/supabaseMenuService';
import AdminOrders from '../components/admin/AdminOrders';
import AdminCaptains from '../components/admin/AdminCaptains';

interface AdminPageProps {
  restaurants: Restaurant[];
  onBack: () => void;
  onRefreshData: () => Promise<void>;
  onAdminLogin?: (admin: any, token?: string) => void;
  onAdminLogout?: () => void;
  reviews?: Review[];
}

const RESTAURANT_NAMES_MAP: Record<string, string> = {
  'Big Bun Burger Bar': 'برجر بار بيج بن 🍔',
  'Green Leaf Salads': 'سلطة الورقة الخضرا 🥗',
  'Sakura Sushi House': 'بيت سوشي ساكورا 🍣',
  'Dragon Ramen Lounge': 'لاونج تنين الرامين 🍜',
  'Sweet Delight Desserts': 'حلويات البهجة والسرور 🍦',
};

export default function AdminPage({ restaurants, onBack, onRefreshData, onAdminLogin, onAdminLogout, reviews, onNavigateCaptain }: AdminPageProps & { onNavigateCaptain?: () => void }) {
  // ✅ ترجمات عربية ثابتة
  const translations: Record<string, string> = {
    egp: "ج",
    backToHome: "الرئيسية",
    adminTitle: "لوحة التحكم",
    adminDesc: "إدارة المطاعم والمنيو والطلبات",
    cancel: "إلغاء",
    addRestaurant: "إضافة مطعم",
    editRestaurant: "تعديل المطعم",
    restaurantName: "اسم المطعم",
    coverImageUrl: "رابط صورة الغلاف",
    categoryTags: "التصنيفات",
    promoText: "نص العرض",
    deliveryTime: "وقت التوصيل",
    deliveryFee: "رسوم التوصيل",
    placeOrder: "حفظ",
    uploadMenuPrompt: "ارفع صورة أو ملف المنيو",
    uploadMenuDesc: "PNG، JPG، PDF، Excel، CSV",
    analyzeLoading: "جاري التحليل بالذكاء الاصطناعي...",
    dragDropFile: "اسحب الملف هنا أو اضغط للاختيار",
    analysisResults: "الأطباق المستخرجة بالذكاء الاصطناعي",
    restaurantSelect: "سيُضاف إلى",
    approveImport: "استيراد المحدد",
    addedSuccess: "✅ تم الاستيراد بنجاح!",
    statusSaved: "✅ تم الحفظ",
    statusDeleted: "🗑️ تم الحذف",
  };
  const t = (key: string) => translations[key] ?? key;
  const isAr = true; // ✅ التطبيق عربي بالكامل

  // Navigation / Tab selection
  const [selectedRestId, setSelectedRestId] = useState<string>(restaurants[0]?.id || "");
  const [isCreatingRest, setIsCreatingRest] = useState(false);
  const [editingRestId, setEditingRestId] = useState<string | null>(null);

  // Dynamic Admins & Permissions states
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("mutafer_logged_in_admin");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Admin Login specific state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Admin Registration specific state
  const [isAdminRegisterMode, setIsAdminRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [whatsappNumberSetting, setWhatsappNumberSetting] = useState("");
  const [deliveryPricingType, setDeliveryPricingType] = useState<'area' | 'distance'>('area');
  const [distanceBaseFee, setDistanceBaseFee] = useState(10);
  const [distanceFeePerKm, setDistanceFeePerKm] = useState(5);
  const [officeLat, setOfficeLat] = useState(30.0626);
  const [officeLng, setOfficeLng] = useState(31.2222);

  // ✅ helper لتحديث settings من أي مكان
  const [settingsExtra, setSettingsExtra] = useState<Record<string, any>>({});
  const handleSettingChange = (key: string, value: any) => {
    setSettingsExtra(prev => ({ ...prev, [key]: value }));
    if (key === 'officeLat') setOfficeLat(value);
    if (key === 'officeLng') setOfficeLng(value);
  };
  const settings = { officeLat, officeLng, ...settingsExtra };
  const [deliveryCommissionType, setDeliveryCommissionType] = useState<'flat' | 'percentage'>('flat');
  const [deliveryCommissionValue, setDeliveryCommissionValue] = useState(15);
  const [aboutUsContentSetting, setAboutUsContentSetting] = useState("");
  const [logoImageSetting, setLogoImageSetting] = useState<string>("");
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Safe confirm deletion handles
  const [deleteConfirmAdminId, setDeleteConfirmAdminId] = useState<string | null>(null);
  const [deleteConfirmRestId, setDeleteConfirmRestId] = useState<string | null>(null);
  const [deleteConfirmDishId, setDeleteConfirmDishId] = useState<string | null>(null);

  // Region and distance based delivery options configuration
  const [deliveryOptions, setDeliveryOptions] = useState<{ id: string; name: string; fee: number }[]>([]);
  const [newRegionName, setNewRegionName] = useState("");
  const [newRegionFee, setNewRegionFee] = useState("");

  // Dynamic categories management
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; nameAr: string; icon: string; visible?: boolean }[]>([]);
  const [newCatId, setNewCatId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatNameAr, setNewCatNameAr] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");

  // Coupons dynamic list configuration
  const [rewardOrderThreshold, setRewardOrderThreshold] = useState(10);
  const [loyaltyCustomers, setLoyaltyCustomers] = useState<any[]>([]);
  const [couponsList, setCouponsList] = useState<{ id: string; code: string; discountType: 'percentage' | 'flat'; discountValue: number; minOrder: number; isActive: boolean }[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'flat'>("percentage");
  const [newCouponValue, setNewCouponValue] = useState("");
  const [newCouponMinOrder, setNewCouponMinOrder] = useState("");

  // Customer orders tracked list
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [captains, setCaptains] = useState<any[]>([]);
  const [captainLocations, setCaptainLocations] = useState<any[]>([]);
  const [expandedCaptainReviews, setExpandedCaptainReviews] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'stores' | 'orders' | 'captains' | 'settings'>('stores');

  useEffect(() => {
    if (adminTab !== 'captains') return;
    const timer = window.setInterval(() => {
      (document.getElementById('admin-refresh-locations') as HTMLButtonElement | null)?.click();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [adminTab]);

  // New admin form state
  const [newAdminForm, setNewAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "editor",
    canManageRestaurants: true,
    canManageMenu: true,
    canUseAIScanner: true
  });

  const fetchCaptainsList = async () => {
    try {
      if (supabaseConfigured) { setCaptains(await listCaptainsFromSupabase()); return; }
      const res = await fetchWithRetry("/api/captains");
      if (res.ok) {
        const data = await res.json();
        setCaptains(data);
      }
    } catch (err) {
      console.error("Error loading captains directory:", err);
    }
  };

  const fetchAdminsAndSettings = async () => {
    try {
      if (supabaseConfigured) setLoyaltyCustomers(await listLoyaltyCustomersFromSupabase(rewardOrderThreshold));
      else { const loyaltyRes = await fetchWithRetry("/api/loyalty/customers"); if (loyaltyRes.ok) setLoyaltyCustomers(await loyaltyRes.json()); }
    } catch {}
    try {
      const adData: any[] = supabaseConfigured
        ? (await listAdminProfilesFromSupabase()).map((item: any) => ({ ...item, canManageRestaurants: item.can_manage_restaurants, canManageMenu: item.can_manage_menu, canUseAIScanner: item.can_use_ai_scanner }))
        : await (async () => { const adRes = await fetchWithRetry("/api/admins"); return adRes.ok ? adRes.json() : []; })();
      setAdminsList(adData);
      if (adData.length > 0) {
        setCurrentAdmin((prev: any) => {
          const synced = prev && adData.find((a: any) => a.id === prev.id);
          if (synced) localStorage.setItem("mutafer_logged_in_admin", JSON.stringify(synced));
          return synced || prev;
        });
      }
    } catch (err) {
      console.error("Error loading admin accounts:", err);
    }

    try {
      const setData = supabaseConfigured
        ? await getSettingsFromSupabase()
        : await (async () => { const res = await fetchWithRetry("/api/settings"); return res.ok ? res.json() : null; })();
      if (setData) {
          if (setData.rewardOrderThreshold !== undefined) setRewardOrderThreshold(Number(setData.rewardOrderThreshold) || 10);
          if (setData.whatsappNumber) {
            setWhatsappNumberSetting(setData.whatsappNumber);
          }
          if (setData.deliveryPricingType) {
            setDeliveryPricingType(setData.deliveryPricingType);
          }
          if (setData.distanceBaseFee !== undefined) {
            setDistanceBaseFee(setData.distanceBaseFee);
          }
          if (setData.distanceFeePerKm !== undefined) {
            setDistanceFeePerKm(setData.distanceFeePerKm);
          }
          if (setData.officeLat !== undefined) {
            setOfficeLat(setData.officeLat);
          }
          if (setData.officeLng !== undefined) {
            setOfficeLng(setData.officeLng);
          }
          if (setData.deliveryCommissionType) {
            setDeliveryCommissionType(setData.deliveryCommissionType);
          }
          if (setData.deliveryCommissionValue !== undefined) {
            setDeliveryCommissionValue(setData.deliveryCommissionValue);
          }
          if (setData.aboutUsContent) {
            setAboutUsContentSetting(setData.aboutUsContent);
          }
          if (setData.logoImage) {
            setLogoImageSetting(setData.logoImage);
          }
          if (setData.deliveryOptions) {
            setDeliveryOptions(setData.deliveryOptions);
          }
          if (setData.coupons) {
            setCouponsList(setData.coupons);
          } else {
            setCouponsList([
              { id: "cp_1", code: "FIRST50", discountType: "percentage", discountValue: 50, minOrder: 0, isActive: true },
              { id: "cp_2", code: "EATS10", discountType: "flat", discountValue: 30, minOrder: 150, isActive: true }
            ]);
          }
          if (setData.categories) {
            setCategoriesList(setData.categories);
          } else {
            setCategoriesList([
              { id: 'all', name: 'All Eats', nameAr: 'كل الأكلات 🍽️', icon: '🍽️' },
              { id: 'burgers', name: 'Burgers', nameAr: 'برجر بجمدان 🍔', icon: '🍔' },
              { id: 'pizza', name: 'Pizza', nameAr: 'بيتزا حكاية 🍕', icon: '🍕' },
              { id: 'salads', name: 'Salads', nameAr: 'سلطات فريش 🥗', icon: '🥗' },
              { id: 'sushi', name: 'Sushi', nameAr: 'سوشي دلع 🍣', icon: '🍣' },
              { id: 'ramen', name: 'Ramen', nameAr: 'رامين ياباني 🍜', icon: '🍜' },
              { id: 'dessert', name: 'Dessert', nameAr: 'حلويات وفرفشة 🍦', icon: '🍦' },
              { id: 'drinks', name: 'Drinks', nameAr: 'مشروبات منعشة 🥤', icon: '🥤' },
              { id: 'sides', name: 'Sides', nameAr: 'مقبلات جانبية 🍟', icon: '🍟' },
              { id: 'offers', name: 'Special Offers', nameAr: 'عروض دمار 🏷️', icon: '🏷️' }
            ]);
          }
        }
    } catch (err) {
      console.error("Error loading settings:", err);
    }

    try {
      if (supabaseConfigured) { setOrdersList(await listAdminOrdersFromSupabase()); }
      else {
      const ordRes = await fetchWithRetry("/api/orders");
      if (ordRes.ok) { const ordData = await ordRes.json(); setOrdersList(ordData); }
      }
    } catch (err) {
      console.error("Error loading admin orders:", err);
    }
  };

  React.useEffect(() => {
    fetchAdminsAndSettings();
    fetchCaptainsList();

    const action = localStorage.getItem("mutafer_admin_action");
    if (action === "create_restaurant") {
      setIsCreatingRest(true);
      setAdminTab("stores");
      localStorage.removeItem("mutafer_admin_action");
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAdmin?.role !== "primary") {
      alert("عفوًا، للمدير الأساسي فقط صلاحية حفظ الإعدادات!");
      return;
    }
    setIsUpdatingSettings(true);
    try {
      if (supabaseConfigured) {
        await saveSettingsToSupabase({ whatsappNumber: whatsappNumberSetting, deliveryPricingType, distanceBaseFee: Number(distanceBaseFee) || 0, distanceFeePerKm: Number(distanceFeePerKm) || 0, deliveryCommissionType, deliveryCommissionValue: Number(deliveryCommissionValue) || 0, aboutUsContent: aboutUsContentSetting, logoImage: logoImageSetting, deliveryOptions, coupons: couponsList, categories: categoriesList, rewardOrderThreshold: Math.max(1, Number(rewardOrderThreshold) || 10) });
        triggerSuccess('تم حفظ الإعدادات على Supabase.');
        return;
      }
      const response = await fetchWithRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsappNumberSetting,
          deliveryPricingType,
          distanceBaseFee: Number(distanceBaseFee) || 0,
          distanceFeePerKm: Number(distanceFeePerKm) || 0,
          deliveryCommissionType,
          deliveryCommissionValue: Number(deliveryCommissionValue) || 0,
          aboutUsContent: aboutUsContentSetting,
          logoImage: logoImageSetting,
          deliveryOptions: deliveryOptions,
          coupons: couponsList,
          categories: categoriesList,
          rewardOrderThreshold: Math.max(1, Number(rewardOrderThreshold) || 10)
        })
      });
      if (response.ok) {
        triggerSuccess("تم حفظ الإعدادات وقواعد التسعير والتوصيل وعمولة الكباتن والتعريف بنجاح!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleAddDeliveryOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAdmin?.role !== "primary" && !currentAdmin?.canManageRestaurants) {
      alert("عفوًا، ليس لديك الصلاحية لإدارة خيارات التوصيل!");
      return;
    }
    if (!newRegionName.trim() || !newRegionFee.trim()) return;

    const newOption = {
      id: `reg_${Date.now()}`,
      name: newRegionName.trim(),
      fee: Number(newRegionFee) || 0
    };

    const updatedOptions = [...deliveryOptions, newOption];
    try {
      const response = await fetchWithRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsappNumberSetting,
          deliveryOptions: updatedOptions,
          coupons: couponsList
        })
      });
      if (response.ok) {
        setDeliveryOptions(updatedOptions);
        setNewRegionName("");
        setNewRegionFee("");
        triggerSuccess(`تم إضافة منطقة التوصيل "${newOption.name}" بنجاح!`);
      }
    } catch (err) {
      console.error("Error adding delivery option:", err);
    }
  };

  const handleDeleteDeliveryOption = async (optionId: string, optionName: string) => {
    if (currentAdmin?.role !== "primary" && !currentAdmin?.canManageRestaurants) {
      alert("عفوًا، ليس لديك الصلاحية لإدارة خيارات التوصيل!");
      return;
    }
    const updatedOptions = deliveryOptions.filter(o => o.id !== optionId);
    try {
      const response = await fetchWithRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsappNumberSetting,
          deliveryOptions: updatedOptions,
          coupons: couponsList
        })
      });
      if (response.ok) {
        setDeliveryOptions(updatedOptions);
        triggerSuccess(`تم حذف خيار التوصيل لـ "${optionName}" بنجاح!`);
      }
    } catch (err) {
      console.error("Error deleting delivery option:", err);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponValue.trim()) return;

    const newOption = {
      id: `cp_${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      discountValue: Number(newCouponValue) || 0,
      minOrder: Number(newCouponMinOrder) || 0,
      isActive: true
    };

    const updatedCoupons = [...couponsList, newOption];
    try {
      const response = await fetchWithRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsappNumberSetting,
          deliveryOptions: deliveryOptions,
          coupons: updatedCoupons
        })
      });
      if (response.ok) {
        setCouponsList(updatedCoupons);
        setNewCouponCode("");
        setNewCouponValue("");
        setNewCouponMinOrder("");
        triggerSuccess(`تم إضافة كوبون الخصم "${newOption.code}" بنجاح!`);
      }
    } catch (err) {
      console.error("Error adding coupon:", err);
    }
  };

  const handleToggleCoupon = async (couponId: string) => {
    const updatedCoupons = couponsList.map(c =>
      c.id === couponId ? { ...c, isActive: !c.isActive } : c
    );
    try {
      const response = await fetchWithRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsappNumberSetting,
          deliveryOptions: deliveryOptions,
          coupons: updatedCoupons
        })
      });
      if (response.ok) {
        setCouponsList(updatedCoupons);
        triggerSuccess(`تم تغيير حالة الكوبون بنجاح!`);
      }
    } catch (err) {
      console.error("Error toggling coupon status:", err);
    }
  };

  const handleDeleteCoupon = async (couponId: string, couponCode: string) => {
    const updatedCoupons = couponsList.filter(c => c.id !== couponId);
    try {
      const response = await fetchWithRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsappNumberSetting,
          deliveryOptions: deliveryOptions,
          coupons: updatedCoupons
        })
      });
      if (response.ok) {
        setCouponsList(updatedCoupons);
        triggerSuccess(`تم حذف الكوبون "${couponCode}" بنجاح!`);
      }
    } catch (err) {
      console.error("Error deleting coupon:", err);
    }
  };

  const handleUpdateOrderCourierStatus = async (orderId: string, status: 'Pending' | 'Received' | 'Preparing' | 'OutForDelivery' | 'Delivered') => {
    try {
      if (supabaseConfigured) { const updated = await updateOrderStatusInSupabase(orderId, { status }); setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o)); triggerSuccess('تم تحديث حالة الطلب على Supabase.'); return; }
      const res = await fetchWithRetry(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrdersList(prev => prev.map(o => o.id === orderId ? updated : o));
        triggerSuccess(
          status === 'OutForDelivery'
            ? 'تم تسجيل استلام الطيار للطلب بنجاح! للعميل يظهر الآن أنه خارج للتوصيل 🏍️'
            : 'تم تحديث حالة الطلب بنجاح بنجاح!'
        );
      }
    } catch (err) {
      console.error("Error updating order status in admin:", err);
    }
  };

  const handleUpdateOrderFullStatus = async (orderId: string, payload: any) => {
    try {
      if (supabaseConfigured) { const updated = await updateOrderStatusInSupabase(orderId, payload); setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o)); triggerSuccess('تم تحديث بيانات الطلب على Supabase.'); return; }
      const res = await fetchWithRetry(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setOrdersList(prev => prev.map(o => o.id === orderId ? updated : o));
        triggerSuccess("تم تحديث معلومات وتفاصيل الطلب بنجاح! 🎉");
      }
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  const handleUpdateCaptainStatus = async (id: string, status: 'approved' | 'suspended' | 'pending') => {
    try {
      const res = await fetchWithRetry(`/api/captains/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        triggerSuccess("تم تحديث حالة تفعيل الكابتن بنجاح! 🛵");
        fetchCaptainsList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCaptain = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب الكابتن "${name}" نهائياً من السيستيم؟`)) return;
    try {
      if (supabaseConfigured) { await deleteCaptainInSupabase(id); triggerSuccess('تم حذف حساب الطيار من Supabase.'); await fetchCaptainsList(); return; }
      const res = await fetchWithRetry(`/api/captains/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerSuccess("تم حذف الكابتن نهائياً بنجاح! 🗑️");
        fetchCaptainsList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAdminFlags = async (updatedList: any[]) => {
    try {
      if (supabaseConfigured) {
        for (const admin of updatedList.filter((item: any) => item.role !== 'primary')) {
          await updateProfilePermissionsInSupabase(admin.id, admin);
        }
        setAdminsList(updatedList);
        triggerSuccess("تم تحديث صلاحيات المشرفين على Supabase.");
        return;
      }
      const response = await fetchWithRetry("/api/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedList)
      });
      if (response.ok) {
        setAdminsList(updatedList);
        triggerSuccess("تم تحديث صلاحيات المشرفين على البرنامج بنجاح!");
      }
    } catch (err) {
      console.error("Failed to update admins flags:", err);
    }
  };

  const handleToggleAdminPermission = (adminId: string, flagName: 'canManageRestaurants' | 'canManageMenu' | 'canUseAIScanner') => {
    const updated = adminsList.map(a => {
      if (a.id === adminId) {
        return { ...a, [flagName]: !a[flagName] };
      }
      return a;
    });
    handleUpdateAdminFlags(updated);
  };

  const handleCreateNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.name.trim()) return;

    const emailStr = newAdminForm.email.trim() || `${Date.now()}@mutafer.com`;
    const passwordStr = newAdminForm.password.trim() || "123456";

    const newAdmin = {
      id: `admin_${Date.now()}`,
      name: newAdminForm.name,
      email: emailStr,
      password: passwordStr,
      role: newAdminForm.role,
      canManageRestaurants: newAdminForm.canManageRestaurants,
      canManageMenu: newAdminForm.canManageMenu,
      canUseAIScanner: newAdminForm.canUseAIScanner
    };

    const updated = [...adminsList, newAdmin];
    try {
      if (supabaseConfigured) {
        await createAdminInSupabase({ name: newAdmin.name, email: newAdmin.email, password: newAdmin.password, canManageRestaurants: newAdmin.canManageRestaurants, canManageMenu: newAdmin.canManageMenu, canUseAIScanner: newAdmin.canUseAIScanner });
        setAdminsList([...adminsList, { ...newAdmin, password: undefined }]);
        triggerSuccess('تم إنشاء الأدمن على Supabase.');
        return;
      }
      const response = await fetchWithRetry("/api/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        setAdminsList(updated);
        setNewAdminForm({
          name: "",
          email: "",
          password: "",
          role: "editor",
          canManageRestaurants: true,
          canManageMenu: true,
          canUseAIScanner: true
        });
        triggerSuccess(`تم إضافة المشرف المساعد "${newAdmin.name}" بنجاح!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAdmin = async (adminId: string, name: string) => {
    if (adminId === currentAdmin?.id) {
      alert("عفوًا، لا يمكنك حذف حسابك النشط حاليًا!");
      return;
    }

    const updated = adminsList.filter(a => a.id !== adminId);
    if (supabaseConfigured) {
      try { await deleteAdminInSupabase(adminId); setAdminsList(list => list.filter(admin => admin.id !== adminId)); triggerSuccess('تم حذف الأدمن من Supabase.'); } catch (error: any) { alert(error.message); }
      return;
    }

    try {
      const response = await fetchWithRetry("/api/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        setAdminsList(updated);
        triggerSuccess(`تم حذف حساب المشرف "${name}" بنجاح!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [activeStoreDropdownId, setActiveStoreDropdownId] = useState<string | null>(null);
  const [activeDishDropdownId, setActiveDishDropdownId] = useState<string | null>(null);

  const [restForm, setRestForm] = useState({
    name: "",
    coverImage: "",
    categories: "",
    promo: "",
    deliveryFee: 0,
    deliveryTime: "",
    rating: 4.8,
    distance: 1.2,
    descriptionString: "",
    openTime: "09:00",
    closeTime: "23:00",
    whatsappNumber: ""
  });

  const [manualItemForm, setManualItemForm] = useState({
    name: "",
    description: "",
    price: 100,
    category: "Popular",
    image: logoImageSetting || "/logo.png"
  });

  const [dragActive, setDragActive] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
  const [selectedImportItems, setSelectedImportItems] = useState<Record<number, boolean>>({});
  const [fileName, setFileName] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);


  // ✅ Selected active restaurant instance helper (آمن)
  useEffect(() => {
    if (!selectedRestId && restaurants.length > 0) setSelectedRestId(restaurants[0].id);
  }, [restaurants, selectedRestId]);

  const activeRestaurant = restaurants.find((r) => r.id === selectedRestId);

  // ✅ Dropdown Menu Component with Refs
  const RestaurantMenuDropdown = ({ rest, isOpen, onToggle, onClose, onEdit, onDelete }: {
    rest: Restaurant;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 160;
      const top = Math.min(rect.bottom + 8, window.innerHeight - 120);
      const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
      setMenuPos({ top, left: Math.max(8, left) });
    };

    useLayoutEffect(() => {
      if (!isOpen) {
        setMenuPos(null);
        return;
      }

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, { passive: true });
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }, [isOpen]);

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (menuRef.current && !menuRef.current.contains(target) &&
            buttonRef.current && !buttonRef.current.contains(target)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return (
      <div className="relative z-10">
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-1 rounded-full hover:bg-slate-200/60 text-slate-500 cursor-pointer transition-all flex items-center justify-center hover:text-slate-700"
          title="Edit or delete restaurant"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isOpen && menuPos && (
          <div
            ref={menuRef}
            className="fixed z-[9999] bg-white opacity-100 backdrop-blur-none isolate border border-slate-200 rounded-xl shadow-2xl w-40 p-1 animate-in fade-in duration-100"
            style={{ backgroundColor: '#ffffff', opacity: 1,
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
            }}
          >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer flex-row-reverse text-right"
              >
                <Edit2 className="h-3.5 w-3.5 text-[#f94c10]" />
                <span>تعديل المطعم</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 text-red-650 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer flex-row-reverse text-right"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                <span>حذف المطعم</span>
              </button>
            </div>
        )}
      </div>
    );
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleFileParse = async (fileToParse?: File) => {
    if (currentAdmin && !currentAdmin.canUseAIScanner) {
      setAiError("عفوًا! هذا الموظف أو المشرف لا يملك الصلاحية الأمنية لاستخدام ماسح الذكاء الاصطناعي على النظام.");
      return;
    }
    const file = fileToParse || selectedFile;
    if (!file) {
      setAiError("يرجى سحب وإفلات صورة المنيو أو كشف الـ Excel، أو الضغط لتحديد الملف أولاً.");
      return;
    }

    if (fileToParse) {
      setSelectedFile(fileToParse);
      setFileName(fileToParse.name);
    }

    setAiLoading(true);
    setAiError(null);
    setAiWarning(null);
    setExtractedItems([]);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64Content = dataUrl.split(",")[1];
        const mimeType = file.type;

        let data: any;
        if (supabaseConfigured) {
          const result = await supabase.functions.invoke('parse-menu', { body: { fileData: base64Content, mimeType, fileName: file.name, customInstructions } });
          if (result.error) throw result.error;
          data = result.data;
        } else {
          const response = await fetchWithRetry("/api/gemini/parse-menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileData: base64Content, mimeType, fileName: file.name, customInstructions }) });
          const raw = await response.text();
          try { data = JSON.parse(raw); } catch { throw new Error(`استجابة غير صالحة من الخادم (${response.status}).`); }
          if (!response.ok) throw new Error(data.error || 'فشل تحليل المنيو.');
        }
        if (data.success && Array.isArray(data.items)) {
          setExtractedItems(data.items);
          // إضافة الأقسام التي اكتشفها AI تلقائيًا إلى قائمة فلاتر الصفحة الرئيسية.
          const discovered: string[] = Array.from(new Set(data.items.map((item: any) => String(item.category || 'sides').trim().toLowerCase()))) as string[];
          const icons: Record<string, string> = { burgers: '🍔', pizza: '🍕', salads: '🥗', sushi: '🍣', ramen: '🍜', dessert: '🍦', drinks: '🥤', sides: '🍟', offers: '🏷️' };
          const arabic: Record<string, string> = { burgers: 'برجر', pizza: 'بيتزا', salads: 'سلطات', sushi: 'سوشي', ramen: 'رامين', dessert: 'حلويات', drinks: 'مشروبات', sides: 'مقبلات', offers: 'عروض' };
          setCategoriesList(previous => {
            const merged = [...previous];
            for (const id of discovered) if (!merged.some(c => c.id === id)) merged.push({ id, name: id, nameAr: arabic[id] || id, icon: icons[id] || '🍽️' });
            fetchWithRetry('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categories: merged }) }).catch(() => {});
            return merged;
          });
          setAiWarning(data.warning || null);
          const autoSelect: Record<number, boolean> = {};
          data.items.forEach((_, idx) => {
            autoSelect[idx] = true;
          });
          setSelectedImportItems(autoSelect);
          triggerSuccess("تم بحمد الله استخراج عناصر المنيو بنجاح!");
        } else {
          setAiError(data.error || "Failed to analyze menu document.");
        }
        setAiLoading(false);
      };

      reader.onerror = () => {
        setAiError("Failed to load binary file stream.");
        setAiLoading(false);
      };
    } catch (err: any) {
      setAiError(err.message || "Something went wrong during parsing.");
      setAiLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileParse(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileParse(e.target.files[0]);
    }
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAdmin && currentAdmin.role !== "primary" && !currentAdmin.canManageRestaurants) {
      alert("خطأ أمني: عفوًا، حسابك لا يمتلك صلاحية تعديل أو إنشاء المطاعم!");
      return;
    }
    try {
      const formattedData = {
        name: restForm.name,
        coverImage: restForm.coverImage || logoImageSetting || "/logo.png",
        categories: editingRestId ? (restaurants.find(r => r.id === editingRestId)?.categories || []) : [],
        promo: restForm.promo || undefined,
        rating: Number(restForm.rating) || 4.5,
        distance: Number(restForm.distance) || 1.0,
        descriptionString: restForm.descriptionString,
        openTime: restForm.openTime || "09:00",
        closeTime: restForm.closeTime || "23:00",
        whatsappNumber: restForm.whatsappNumber || ""
      };

      if (supabaseConfigured) {
        await saveRestaurantInSupabase(formattedData, editingRestId || undefined);
        await onRefreshData();
        setIsCreatingRest(false);
        setEditingRestId(null);
        triggerSuccess(t("statusSaved"));
        return;
      }

      let url = "/api/restaurants";
      let method = "POST";

      if (editingRestId) {
        url = `/api/restaurants/${editingRestId}`;
        method = "PUT";
      }

      const response = await fetchWithRetry(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData)
      });

      if (response.ok) {
        const saved = await response.json();
        await onRefreshData();
        setSelectedRestId(saved.id);
        setIsCreatingRest(false);
        setEditingRestId(null);
        setRestForm({
          name: "",
          coverImage: "",
          categories: "",
          promo: "",
          deliveryFee: 0,
          deliveryTime: "",
          rating: 4.8,
          distance: 1.2,
          descriptionString: "",
          openTime: "09:00",
          closeTime: "23:00",
          whatsappNumber: ""
        });
        triggerSuccess(t("statusSaved"));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteRestaurant = async (restId: string) => {
    if (currentAdmin && currentAdmin.role !== "primary" && !currentAdmin.canManageRestaurants) {
      alert("خطأ أمني: لا تملك الصلاحية اللازمة لحذف مطاعم من التطبيق!");
      return;
    }

    try {
      if (supabaseConfigured) {
        await deleteRestaurantInSupabase(restId);
        await onRefreshData();
        setSelectedRestId(restaurants[0]?.id || "");
        triggerSuccess(t("statusDeleted"));
        return;
      }
      const res = await fetchWithRetry(`/api/restaurants/${restId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        await onRefreshData();
        setSelectedRestId(restaurants[0]?.id || "");
        triggerSuccess(t("statusDeleted"));
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "غير مصرح لك بحذف هذا المطعم. سجّل خروجًا من الأدمن ثم ادخل مرة أخرى.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleAddManualMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAdmin && currentAdmin.role !== "primary" && !currentAdmin.canManageMenu) {
      alert("خطأ أمني: لا تمتلك الصلاحية اللازمة لإضافة أو تعديل أصناف المنيو!");
      return;
    }
    if (!selectedRestId) return;

    try {
      if (supabaseConfigured) {
        await addMenuItemsToSupabase(selectedRestId, [manualItemForm]);
        await onRefreshData();
        setManualItemForm({ name: "", description: "", price: 100, category: "أصناف متنوعة", image: logoImageSetting || "/logo.png" });
        triggerSuccess('تمت إضافة الصنف بنجاح.');
        return;
      }
      const response = await fetchWithRetry(`/api/restaurants/${selectedRestId}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualItemForm)
      });

      if (response.ok) {
        await onRefreshData();
        setManualItemForm({
          name: "",
          description: "",
          price: 100,
          category: "Popular",
          image: logoImageSetting || "/logo.png"
        });
        triggerSuccess("Successfully added menu option!");
      }
    } catch (err) {
      console.error("Manual add failed:", err);
    }
  };

  const handleImportExtracted = async () => {
    if (currentAdmin && currentAdmin.role !== "primary" && !currentAdmin.canManageMenu) {
      alert("خطأ الصلاحية: لا تملك صلاحية لإدراج أو تعديل أصناف المنيو على البرنامج!");
      return;
    }
    if (!selectedRestId || extractedItems.length === 0) return;

    const itemsToImport = extractedItems
      .filter((_, idx) => selectedImportItems[idx])
      .map((item) => ({
        ...item,
        image: item.image || undefined, // السيرفر يضع اللوجو الافتراضي بدون تكرار base64 داخل كل صنف
      }));
    if (itemsToImport.length === 0) {
      alert("No items selected for import");
      return;
    }

    try {
      // إرسال دفعات صغيرة يمنع فشل HTTP/2 عندما تكون صور المنيو أو اللوجو كبيرة.
      for (let start = 0; start < itemsToImport.length; start += 5) {
        const batch = itemsToImport.slice(start, start + 5);
        if (supabaseConfigured) {
        await addMenuItemsToSupabase(selectedRestId, itemsToImport);
        await onRefreshData();
        setExtractedItems([]);
        setFileName(null);
        triggerSuccess(t("addedSuccess"));
        return;
      }
      const response = await fetchWithRetry(`/api/restaurants/${selectedRestId}/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch)
        }, 2, 700);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `تعذر استيراد الدفعة ${Math.floor(start / 5) + 1}.`);
        }
      }
      await onRefreshData();
      setExtractedItems([]);
      setFileName(null);
      triggerSuccess(t("addedSuccess"));
    } catch (err: any) {
      console.error("AI dishes import failed:", err);
      setAiError(err?.message || "تعذر استيراد الأصناف. جرّب دفعات أصغر أو ملفًا أخف.");
    }
  };

  const handleSetEditRestaurant = (rest: Restaurant) => {
    if (currentAdmin && currentAdmin.role !== "primary" && !currentAdmin.canManageRestaurants) {
      alert("خطأ أمني: حسابك لا يمتلك صلاحية تعديل بيانات المطاعم المسجلة!");
      return;
    }
    setEditingRestId(rest.id);
    setIsCreatingRest(true);
    setRestForm({
      name: rest.name,
      coverImage: rest.coverImage,
      categories: rest.categories.join(", "),
      promo: rest.promo || "",
      deliveryFee: rest.deliveryFee,
      deliveryTime: rest.deliveryTime,
      rating: rest.rating,
      distance: rest.distance,
      descriptionString: rest.descriptionString,
      openTime: rest.openTime || "09:00",
      closeTime: rest.closeTime || "23:00",
      whatsappNumber: rest.whatsappNumber || ""
    });
  };

  const handleScrollToRestaurantForm = () => {
    setEditingRestId(null);
    setRestForm({
      name: "",
      coverImage: "",
      categories: "",
      promo: "",
      deliveryFee: 0,
      deliveryTime: "",
      rating: 4.8,
      distance: 1.2,
      descriptionString: "",
      openTime: "09:00",
      closeTime: "23:00",
      whatsappNumber: ""
    });
    setAdminTab('stores');
    setIsCreatingRest(true);
    setTimeout(() => {
      const element = document.getElementById("restaurant-form-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // ✅ دالة تسجيل الدخول (معدلة، بدون أقواس زائدة)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError("");
    setAdminLoginLoading(true);

    try {
      if (supabaseConfigured) {
        const profile: any = await signInWithSupabase(adminEmail, adminPassword);
        if (!['admin', 'primary'].includes(profile.role)) throw new Error('هذا الحساب ليس حساب أدمن.');
        const admin = { id: profile.id, name: profile.name, email: profile.email, role: profile.role, canManageRestaurants: profile.can_manage_restaurants || profile.role === 'primary', canManageMenu: profile.can_manage_menu || profile.role === 'primary', canUseAIScanner: profile.can_use_ai_scanner || profile.role === 'primary' };
        setCurrentAdmin(admin);
        localStorage.setItem('mutafer_logged_in_admin', JSON.stringify(admin));
        onAdminLogin?.(admin);
        triggerSuccess(`مرحباً بك يا ${admin.name}! تم تسجيل الدخول بنجاح.`);
        return;
      }
      const res = await fetchWithRetry('/api/admins/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) saveToken(data.token);
        if (onAdminLogin) {
          onAdminLogin(data.admin, data.token);
        }
        setCurrentAdmin(data.admin);
        localStorage.setItem("mutafer_logged_in_admin", JSON.stringify(data.admin));
        triggerSuccess(`مرحباً بك يا ${data.admin.name}! تم تسجيل الدخول بنجاح.`);
      } else {
        setAdminLoginError(data.error || "البريد الإلكتروني أو الرقم السري غير صحيح!");
      }
    } catch (err) {
      setAdminLoginError("تعذر الاتصال بخادم مسافر.");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError("");
    setAdminLoginLoading(true);
    try {
      if (supabaseConfigured) {
        await createAdminInSupabase({ name: registerName, email: registerEmail, password: registerPassword, canManageRestaurants: true, canManageMenu: true, canUseAIScanner: true });
        triggerSuccess(`تم إنشاء حساب المشرف ${registerName} بنجاح.`);
        setIsAdminRegisterMode(false);
        return;
      }
      const response = await fetchWithRetry("/api/admins/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: registerName, email: registerEmail, password: registerPassword })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentAdmin(data.admin);
        localStorage.setItem("mutafer_logged_in_admin", JSON.stringify(data.admin));
        if (onAdminLogin) {
          onAdminLogin(data.admin);
        }
        triggerSuccess(`تم إنشاء حساب المشرف ${data.admin.name} وتفعيله حالاً 🎉`);
        setIsAdminRegisterMode(false);
      } else {
        setAdminLoginError(data.error || "فشل تسجيل حساب أدمن جديد.");
      }
    } catch (err) {
      setAdminLoginError("تعذر الاتصال بخادم مسافر.");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setCurrentAdmin(null);
    localStorage.removeItem("mutafer_logged_in_admin");
    if (onAdminLogout) {
      onAdminLogout();
    }
  };

  // إذا لم يكن هناك مشرف مسجل دخول، نعرض نموذج الدخول
  if (!currentAdmin) {
      return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[70vh]" dir={isAr ? "rtl" : "ltr"}>
        <div className="w-full max-w-md bg-white rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🔐</span>
            <h2 className="text-2xl font-black text-slate-800 font-display">
              {isAdminRegisterMode
                ? (isAr ? "إنشاء حساب مشرف جديد" : "Admin Registration")
                : (isAr ? "لوحة تحكم الإدارة الحصينة" : "Admin Panel Login")
              }
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isAdminRegisterMode
                ? (isAr ? "سجل كأدمن لتتمكن من إضافة مطاعم وتعديل الوجبات وضبط طريقة الشحن" : "Register as supervisor to manage stores and products.")
                : (isAr ? "الرجاء تسجيل الدخول ببيانات المشرف لمتابعة إدارة المطاعم والمنيوهات والطلبات" : "Please log in to manage restaurants, menus and orders.")
              }
            </p>
          </div>

          <div className="flex bg-slate-150 bg-slate-100 rounded-2xl p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setIsAdminRegisterMode(false);
                setAdminLoginError("");
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl cursor-pointer transition-all ${!isAdminRegisterMode ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {isAr ? "تسجيل الدخول" : "Login"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdminRegisterMode(true);
                setAdminLoginError("");
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl cursor-pointer transition-all ${isAdminRegisterMode ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {isAr ? "إنشاء حساب أدمن 👤" : "Register Admin"}
            </button>
          </div>

          {adminLoginError && (
            <div className="p-3.5 bg-red-50 border border-red-150 rounded-2xl text-red-650 text-xs font-bold text-center">
              ⚠️ {adminLoginError}
            </div>
          )}

          {isAdminRegisterMode ? (
            <form onSubmit={handleAdminRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block text-right">
                  {isAr ? "الاسم الكامل" : "Full Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? "مثال: هاني شاكر" : "e.g. John Doe"}
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block text-right">
                  {isAr ? "البريد الإلكتروني للإدارة" : "Admin Email Address"}
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@mutafer.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block text-right">
                  {isAr ? "كلمة المرور الحصينة" : "Password"}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoginLoading}
                className="w-full py-3.5 bg-[#f94c10] hover:bg-[#e03d08] text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adminLoginLoading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                    <span>{isAr ? "جاري الحفظ والإنشاء..." : "Creating Account..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "إنشاء حساب المشرف وتفعيله 🚀" : "Register & Start Administering"}</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block text-right">
                  {isAr ? "البريد الإلكتروني الخاص بالمشرف" : "Admin Email Address"}
                </label>
                <input
                  type="email"
                  required
                  placeholder="email@mutafer.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block text-right">
                  {isAr ? "كلمة المرور" : "Password"}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoginLoading}
                className="w-full py-3.5 bg-[#f94c10] hover:bg-[#e03d08] text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adminLoginLoading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                    <span>{isAr ? "جاري فك التشفير..." : "Decoding..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "دخول لوحة التحكم 🔑" : "Access Console"}</span>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <button
              onClick={onBack}
              className="text-xs text-slate-500 hover:text-[#f94c10] font-extrabold transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{isAr ? "العودة لتصفح المطابخ" : "Go back to dining map"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN ADMIN DASHBOARD (بعد تسجيل الدخول)
  // ============================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8" dir={"rtl"}>

      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-[#f94c10] hover:scale-102 transition-transform mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("backToHome")}</span>
          </button>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800 font-display flex items-center gap-2">
            <Building2 className="text-[#f94c10]" />
            <span>{t("adminTitle")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {t("adminDesc")}
          </p>
        </div>

        <button
          onClick={handleScrollToRestaurantForm}
          className="bg-[#f94c10] hover:bg-[#e03d08] text-white rounded-full py-2.5 px-6 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{isCreatingRest ? t("cancel") : t("addRestaurant")}</span>
        </button>
      </div>

      {/* Active Admin Indicator Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="text-right">
          <h4 className="text-xs font-black text-[#f94c10] tracking-wider uppercase mb-1 flex items-center gap-1">
            <span>🛡️ حساب الإدارة النشط حالياً</span>
          </h4>
          <p className="text-xs text-slate-300 font-medium">أنت مسجل الدخول باسم: <strong className="text-white font-extrabold">{currentAdmin?.name}</strong></p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <span className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-black">
            {currentAdmin?.role === 'primary' ? 'المدير الأساسي 🔑' : 'مشرف مساعد 👥'}
          </span>
          <button
            onClick={handleAdminLogout}
            className="bg-[#f94c10] hover:bg-[#e03d08] text-white rounded-xl py-2 px-4 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            تسجيل الخروج 🚪
          </button>
        </div>
      </div>

      {/* Admin and settings configurations (Visible only to Primary Admin) */}
      <AdminPermissions
        ctx={{ adminsList, currentAdmin, deleteConfirmAdminId, setDeleteConfirmAdminId, handleDeleteAdmin, handleToggleAdminPermission, handleCreateNewAdmin, newAdminForm, setNewAdminForm, isAr }}
      />

      {/* Floating Success Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="h-5 w-5 bg-white/20 rounded-full p-0.5" />
          <span className="text-xs sm:text-sm font-bold">{successMsg}</span>
        </div>
      )}

      <AdminStatistics orders={ordersList} restaurants={restaurants} />

      {/* PREMIUM CHROME TAB BAR SWITCHER */}
      <div className="flex border-b border-slate-205 gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setAdminTab('stores')}
          className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${adminTab === 'stores'
              ? 'bg-[#f94c10] text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-105'
            }`}
        >
          <span>🏪</span>
          <span>{isAr ? 'إدارة المتاجر والمأكولات' : 'Stores & Menus'}</span>
        </button>

        <button
          onClick={() => { setAdminTab('orders'); fetchAdminsAndSettings(); }}
          className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 relative ${adminTab === 'orders'
              ? 'bg-[#0ea5e9] text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-105'
            }`}
        >
          <span>📦</span>
          <span>{isAr ? 'موافقة وإشراف الطلبات المعلقة' : 'Live WhatsApp Approvals'}</span>
          {ordersList.filter(o => o.status === 'Pending').length > 0 && (
            <span className="bg-red-500 text-white font-black text-[9px] h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
              {ordersList.filter(o => o.status === 'Pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setAdminTab('captains'); fetchCaptainsList(); }}
          className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 relative ${adminTab === 'captains'
              ? 'bg-[#f43f5e] text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-105'
            }`}
        >
          <span>🛵</span>
          <span>{isAr ? 'حسابات كباتن التوصيل' : 'Captains Directory'}</span>
          {captains.filter(c => c.status === 'pending').length > 0 && (
            <span className="bg-red-500 text-white font-black text-[9px] h-4 w-4 rounded-full flex items-center justify-center animate-pulse font-mono">
              {captains.filter(c => c.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setAdminTab('settings'); fetchAdminsAndSettings(); }}
          className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 relative ${adminTab === 'settings'
              ? 'bg-[#10b981] text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-105'
            }`}
        >
          <span>⚙️</span>
          <span>{isAr ? 'المناطق والكوبونات والأسعار' : 'Zones, Coupons & Pricing'}</span>
        </button>
      </div>

      {/* CREATE / EDIT RESTAURANT SHEET */}
      {adminTab === 'stores' && isCreatingRest && (
        <form id="restaurant-form-section" onSubmit={handleSaveRestaurant} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="md:col-span-2 text-base md:text-lg font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-2">
            <Plus className="text-orange-500 h-5 w-5" />
            <span>{editingRestId ? t("editRestaurant") : t("addRestaurant")}</span>
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">{t("restaurantName")} *</label>
            <input
              required
              type="text"
              value={restForm.name}
              onChange={(e) => setRestForm({ ...restForm, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">صورة الغلاف</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-all">
                <span className="text-lg">🖼️</span>
                <span className="text-xs text-slate-500 truncate">
                  {restForm._coverFile ? restForm._coverFile.name : "اختر صورة للغلاف..."}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    uploadImageFile(file).then(url => setRestForm(prev => ({ ...prev, coverImage: url, _coverFile: file }))).catch(err => setAiError(err.message));
                  }}
                />
              </label>
              {restForm.coverImage && (
                <img src={restForm.coverImage} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
              )}
            </div>
            <p className="text-[10px] text-slate-400">لو ما اخترتش صورة هيستخدم صورة اللوجو الافتراضية</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">{t("promoText")}</label>
            <input
              type="text"
              placeholder="FREE DELIVERY or 50% OFF"
              value={restForm.promo}
              onChange={(e) => setRestForm({ ...restForm, promo: e.target.value })}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">وقت فتح المطعم ⏰</label>
            <input
              type="time"
              value={restForm.openTime}
              onChange={(e) => setRestForm({ ...restForm, openTime: e.target.value })}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500 font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">وقت إغلاق المطعم 🔒</label>
            <input
              type="time"
              value={restForm.closeTime}
              onChange={(e) => setRestForm({ ...restForm, closeTime: e.target.value })}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500 font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">رقم واتساب المطعم (اختياري) 💬</label>
            <input
              type="text"
              placeholder="مثال: 201016789012"
              value={restForm.whatsappNumber}
              onChange={(e) => setRestForm({ ...restForm, whatsappNumber: e.target.value })}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500 font-bold font-mono"
            />
          </div>

          <div className="md:col-span-2 space-y-1 pt-1">
            <label className="text-xs font-bold text-slate-600">Short Bio / Description</label>
            <textarea
              rows={3}
              required
              value={restForm.descriptionString}
              onChange={(e) => setRestForm({ ...restForm, descriptionString: e.target.value })}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl p-4 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500 resize-none"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreatingRest(false);
                setEditingRestId(null);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-6 rounded-full text-xs font-bold cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white py-2 px-6 rounded-full text-xs font-bold cursor-pointer"
            >
              {t("placeOrder").replace("🚀", "")}
            </button>
          </div>
        </form>
      )}

      {/* DUAL WORKSPACE: RESTAURANT TERMINAL AND AI SCANNING PORTAL */}
      {adminTab === 'stores' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN: SHOP TERMINALS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-50">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏪 {isAr ? 'المطاعم المسجلة' : 'Stores Registered'}</span>
                </h3>
                <button
                  type="button"
                  onClick={handleScrollToRestaurantForm}
                  className="bg-orange-50 hover:bg-orange-100 text-[#f94c10] border border-orange-100 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  id="btn-add-store-registered"
                >
                  <span>➕</span>
                  <span>{isAr ? 'إضافة مطعم' : 'Add Store'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-visible no-scrollbar" style={{overflowX: "visible"}}>
                {restaurants.map((rest) => {
                  const isActive = rest.id === selectedRestId;
                  return (
                    <div
                      key={rest.id}
                      onClick={() => {
                        setSelectedRestId(rest.id);
                        handleSetEditRestaurant(rest);
                      }}
                      className={`p-3 rounded-2xl border transition-all flex justify-between items-center cursor-pointer ${isActive
                          ? "bg-orange-50 border-orange-200 text-[#f94c10]"
                          : "bg-white border-slate-100 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <button
                        type="button"
                        className={`flex-1 font-semibold text-xs truncate max-w-[150px] cursor-pointer ${'text-right'
                          }`}
                      >
                        {rest.name}
                      </button>

                      <RestaurantMenuDropdown 
                        rest={rest}
                        isOpen={activeStoreDropdownId === rest.id}
                        onToggle={() => setActiveStoreDropdownId((prev) => prev === rest.id ? null : rest.id)}
                        onClose={() => setActiveStoreDropdownId(null)}
                        onEdit={() => {
                          handleSetEditRestaurant(rest);
                          setActiveStoreDropdownId(null);
                        }}
                        onDelete={() => {
                          setDeleteConfirmRestId(rest.id);
                          setActiveStoreDropdownId(null);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ADD ITEM MANUAL PORTAL */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight font-display mb-3 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <ClipboardList className="text-slate-400 h-4.5 w-4.5" />
                <span>إضافة صنف يدويًا</span>
              </h3>

              <form onSubmit={handleAddManualMenuItem} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">اسم الصنف</label>
                  <input
                    required
                    type="text"
                    value={manualItemForm.name}
                    onChange={(e) => setManualItemForm({ ...manualItemForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">الوصف</label>
                  <textarea
                    required
                    placeholder="اكتب وصف الصنف..."
                    value={manualItemForm.description}
                    onChange={(e) => setManualItemForm({ ...manualItemForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400" >السعر ({t("egp")})</label>
                    <input
                      required
                      type="number"
                      value={manualItemForm.price}
                      onChange={(e) => setManualItemForm({ ...manualItemForm, price: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-500">{'فئة الطعام (القسم) *'}</label>
                    <select
                      value={manualItemForm.category}
                      onChange={(e) => setManualItemForm({ ...manualItemForm, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs outline-none font-bold"
                    >
                      {categoriesList.filter(c => c.id !== 'all').map(cat => (
                        <option key={cat.id} value={cat.id || cat.name}>
                          {cat.nameAr || cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">صورة الصنف من الجهاز</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    uploadImageFile(file).then(url => setManualItemForm(prev => ({ ...prev, image: url }))).catch(err => setSuccessMsg(err.message));
                  }} className="w-full text-xs" />
                  <p className="text-[9px] text-slate-400">إذا لم تختر صورة سيتم استخدام لوجو الموقع.</p>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <span>إضافة الصنف إلى المنيو</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT TWO COLUMNS: AI SCANNING & PARSING WORKSPACE */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden border border-slate-800">
              <div className="absolute right-[-20px] top-[-20px] text-indigo-500 opacity-10 pointer-events-none">
                <Sparkles size={220} />
              </div>

              <div className="z-10 relative">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-[10px] md:text-xs font-black tracking-widest px-3 py-1.5 rounded-full uppercase mb-4 shadow-sm animate-pulse">
                  <Sparkles className="h-3.5 w-3.5 fill-current" />
                  <span>POWERED BY GEMINI 3.5 AI</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight font-display">
                  {t("uploadMenuPrompt")}
                </h2>
                <p className="text-slate-300 text-xs mt-1 md:max-w-xl leading-relaxed">
                  {t("uploadMenuDesc")}
                </p>
              </div>

              <div className="z-10 relative bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-orange-400 mb-1">
                    {"🏪 اختر المطعم المستهدف لإضافة الأصناف إليه"}
                  </label>
                  <p className="text-[10px] text-slate-400 mb-3">
                    {"اضغط على المطعم بالأسفل لاختياره مباشرة كوجهة للأصناف المستخرجة بالذكاء الاصطناعي."}
                  </p>
                </div>

                <div
                  id="ai-target-restaurant-selector"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
                  style={{ direction: 'rtl' }}
                >
                  {restaurants.map(r => {
                    const displayRestName = RESTAURANT_NAMES_MAP[r.name] || r.name;
                    const isSelected = selectedRestId === r.id;
                    return (
                      <button
                        type="button"
                        key={`ai-sel-${r.id}`}
                        onClick={() => setSelectedRestId(r.id)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer group select-none ${isSelected
                            ? "border-[#f94c10] bg-orange-500/10 shadow-[0_0_12px_rgba(249,76,16,0.2)]"
                            : "border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700"
                          }`}
                      >
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 bg-[#f94c10] text-white rounded-full p-0.5 text-[8px] font-bold">
                            ✓
                          </span>
                        )}
                        <span className="text-xl mb-1 group-hover:scale-110 transition-transform">
                          {r.name.includes('Burger') ? '🍔' : r.name.includes('Pizza') ? '🍕' : r.name.includes('Salads') ? '🥗' : r.name.includes('Sushi') ? '🍣' : r.name.includes('Ramen') ? '🍜' : r.name.includes('Dessert') ? '🍦' : '🏪'}
                        </span>
                        <span className={`text-[11px] font-bold leading-tight line-clamp-2 transition-colors ${isSelected ? "text-orange-400" : "text-slate-300"
                          }`}>
                          {displayRestName}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleScrollToRestaurantForm}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/20 hover:bg-[#f94c10]/10 hover:border-orange-500 text-center transition-all cursor-pointer group"
                  >
                    <span className="text-xl mb-1 text-orange-400 group-hover:scale-110 transition-transform">➕</span>
                    <span className="text-[11px] font-bold text-orange-400 group-hover:text-orange-300">
                      {'إضافة مطعم جديد...'}
                    </span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center pt-2 border-t border-slate-900">
                  <select
                    value={selectedRestId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "NEW_STORE") {
                        handleScrollToRestaurantForm();
                        triggerSuccess('نموذج المطعم مفعل بالأعلى!');
                      } else {
                        setSelectedRestId(val);
                      }
                    }}
                    className="flex-1 text-xs bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-bold"
                  >
                    <option value="" disabled>{'-- اختر مطعماً --'}</option>
                    {restaurants.map(r => {
                      const displayRestName = RESTAURANT_NAMES_MAP[r.name] || r.name;
                      return (
                        <option key={r.id} value={r.id}>{displayRestName}</option>
                      );
                    })}
                    <option value="NEW_STORE" className="text-orange-400 font-bold">
                      {'➕ إضافة مطعم جديد...'}
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={handleScrollToRestaurantForm}
                    className="bg-[#f94c10] hover:bg-[#d83f0c] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{"اضافة مطعم جديد"}</span>
                  </button>
                </div>
              </div>

              {/* AI Custom prompt customInstructions input field */}
              <div className="z-10 relative bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-bold text-orange-400">
                  {"📝 توجيهات خاصة بالذكاء الاصطناعي (اختياري)"}
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={
                    "مثال: 'ترجم أسماء الوجبات فقط للغة العربية'، 'قم بزيادة كافة الأسعار بمعدل 15%'، أو 'استخرج الوجبات النباتية فحسب'..."
                  }
                  rows={2}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
                />
                <p className="text-[10px] text-slate-400">
                  {"سيقوم نظام Gemini بتطبيق هذه التعليمات أثناء قراءة المنيو أو الكشف المرفوع أدناه."}
                </p>
                {selectedFile && !aiLoading && (
                  <button
                    type="button"
                    onClick={() => handleFileParse()}
                    className="mt-1 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-orange-400 hover:text-orange-350 cursor-pointer transition-all uppercase"
                  >
                    <Sparkles size={13} className="animate-pulse text-orange-400" />
                    <span>{"إعادة تحليل الملف الحالي بالطلب الجديد"}</span>
                  </button>
                )}
              </div>

              {/* DRAG AND DROP / FILE SELECT PANEL */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden ${dragActive
                    ? "border-[#f94c10] bg-orange-500/10"
                    : "border-slate-800 bg-slate-950/40 hover:bg-slate-950/60"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {aiLoading ? (
                  <div className="py-6 space-y-3 flex flex-col items-center justify-center">
                    <Loader2 className="h-10 w-10 text-[#f94c10] animate-spin" />
                    <p className="text-xs font-bold text-slate-300 animate-pulse">{t("analyzeLoading")}</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="bg-slate-800 p-3 rounded-full text-orange-400 inline-block">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-200">
                      {fileName ? `Attached: ${fileName}` : t("dragDropFile")}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Supports PNG, JPEG, PDF, TXT, CSV or Excel (XLS/XLSX) files
                    </p>
                  </div>
                )}
              </div>

              {/* AI parse error banner */}
              {aiError && (
                <div className="p-4 bg-red-650 text-white rounded-2xl flex items-center gap-3 text-xs font-medium">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* AI parse warning banner */}
              {aiWarning && (
                <div className="p-4 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs font-medium">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                  <span>{aiWarning}</span>
                </div>
              )}

              {/* AI EXTRACTED CONTENT LIST PORTAL */}
              {extractedItems.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-800 z-10 relative">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 font-display">
                      <ClipboardList className="text-[#f94c10]" />
                      <span>{t("analysisResults")} ({extractedItems.length})</span>
                    </h4>

                    <span className="text-[10px] text-slate-400 bg-slate-950 px-3 py-1 rounded-md">
                      {t("restaurantSelect")}: <strong className="text-amber-400">{activeRestaurant?.name}</strong>
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                    <div className="max-h-72 overflow-y-auto no-scrollbar">
                      <table className="w-full text-left font-sans text-xs">
                        <thead className="bg-[#1e293b] text-slate-300 uppercase text-[10px] font-bold sticky top-0">
                          <tr>
                            <th className="p-3 text-center w-12">Import?</th>
                            <th className="p-3">Item Details</th>
                            <th className="p-3 w-16 text-center">الصورة</th>
                            <th className="p-3 w-24">السعر</th>
                            <th className="p-3 w-28">الفئة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {extractedItems.map((item, idx) => {
                            const isSelected = !!selectedImportItems[idx];
                            return (
                              <tr key={idx} className={`hover:bg-slate-900/40 text-slate-300 ${isSelected ? "bg-slate-900/20" : "opacity-50"}`}>
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedImportItems({
                                        ...selectedImportItems,
                                        [idx]: !isSelected
                                      });
                                    }}
                                    className="h-4 w-4 rounded filter accent-orange-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3 space-y-0.5">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => {
                                      const copy = [...extractedItems];
                                      copy[idx].name = e.target.value;
                                      setExtractedItems(copy);
                                    }}
                                    className="font-bold text-slate-100 bg-transparent border-b border-transparent focus:border-slate-700 outline-none w-full"
                                  />
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => {
                                      const copy = [...extractedItems];
                                      copy[idx].description = e.target.value;
                                      setExtractedItems(copy);
                                    }}
                                    className="text-[11px] text-slate-400 bg-transparent border-b border-transparent focus:border-slate-700 outline-none w-full"
                                  />
                                  {item.sizes && item.sizes.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-2" dir="rtl">
                                      <span className="text-[9px] text-slate-500 font-bold">الأحجام والأسعار:</span>
                                      {item.sizes.map((sz: any, szIdx: number) => (
                                        <div key={szIdx} className="flex items-center gap-1.5 bg-[#1e293b] px-2 py-1 rounded border border-slate-800">
                                          <input
                                            type="text"
                                            value={sz.name}
                                            onChange={(e) => {
                                              const copy = [...extractedItems];
                                              copy[idx].sizes[szIdx].name = e.target.value;
                                              setExtractedItems(copy);
                                            }}
                                            className="text-[10px] text-slate-300 font-bold bg-transparent outline-none w-16 border-b border-slate-700 focus:border-orange-500"
                                          />
                                          <span className="text-slate-600 text-[9px]">:</span>
                                          <input
                                            type="number"
                                            value={sz.price}
                                            onChange={(e) => {
                                              const copy = [...extractedItems];
                                              copy[idx].sizes[szIdx].price = Number(e.target.value) || 0;
                                              // أقل سعر يبقى الـ price الرئيسي
                                              copy[idx].price = Math.min(...copy[idx].sizes.map((s: any) => s.price));
                                              setExtractedItems(copy);
                                            }}
                                            className="text-[10px] text-[#f94c10] font-mono font-bold bg-transparent outline-none w-14 border-b border-slate-700 focus:border-orange-500 text-center"
                                          />
                                          <span className="text-[9px] text-slate-500">ج</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <label className="flex flex-col items-center gap-1 cursor-pointer group">
                                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0 group-hover:border-orange-500 transition-colors">
                                      <img
                                        src={item.image || "/logo.png"}
                                        alt={item.name}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <span className="text-[8px] text-slate-500 group-hover:text-orange-400">تغيير الصورة</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        uploadImageFile(file).then(url => {
                                          setExtractedItems(items => items.map((item, itemIndex) => itemIndex === idx ? { ...item, image: url } : item));
                                        }).catch(err => setAiError(err.message));
                                      }}
                                    />
                                  </label>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={item.price}
                                      onChange={(e) => {
                                        const copy = [...extractedItems];
                                        copy[idx].price = Number(e.target.value) || 0;
                                        setExtractedItems(copy);
                                      }}
                                      className="px-1.5 py-1 bg-slate-900 border border-slate-800 rounded outline-none w-16 text-center font-bold text-amber-300"
                                    />
                                    <span className="text-[10px] font-semibold text-slate-400">{t("egp")}</span>
                                  </div>
                                  {(item.category?.toLowerCase?.() === 'offers') && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <span className="text-[8px] text-orange-400 font-bold">السعر الأصلي:</span>
                                      <input
                                        type="number"
                                        value={item.originalPrice || ''}
                                        placeholder="—"
                                        onChange={(e) => {
                                          const copy = [...extractedItems];
                                          copy[idx].originalPrice = Number(e.target.value) || undefined;
                                          setExtractedItems(copy);
                                        }}
                                        className="px-1.5 py-0.5 bg-slate-900 border border-orange-800/50 rounded outline-none w-14 text-center font-bold text-orange-300 text-[10px] line-through"
                                      />
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <input
                                    list="ai-category-options"
                                    value={item.category || ''}
                                    onChange={(e) => {
                                      const copy = [...extractedItems];
                                      copy[idx].category = e.target.value;
                                      setExtractedItems(copy);
                                    }}
                                    className="px-1.5 py-1 bg-slate-900 border border-slate-800 rounded outline-none text-[10px] font-bold text-slate-200 w-28"
                                  />
                                  <datalist id="ai-category-options">
                                    {categoriesList.map(cat => <option key={cat.id} value={cat.nameAr || cat.name || cat.id} />)}
                                    <option value="كريب" /><option value="مشروبات" /><option value="قهوة" /><option value="حلويات" /><option value="أصناف متنوعة" />
                                  </datalist>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setExtractedItems([]);
                        setFileName(null);
                      }}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-300 py-2 px-6 rounded-full text-xs font-bold cursor-pointer transition-all"
                    >
                      Clear Preview
                    </button>
                    <button
                      onClick={handleImportExtracted}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 px-6 rounded-full text-xs font-black cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>{t("approveImport")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ACTIVE RESTAURANT ITEMS PREVIEW & DELETE PORTAL */}
            {activeRestaurant && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                    <Building2 className="text-slate-400 h-5 w-5" />
                    <span>{activeRestaurant.name} • أصناف المنيو ({activeRestaurant.menu?.length || 0})</span>
                  </h3>

                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                    التقييم: {activeRestaurant.rating} ★
                  </span>
                </div>

                {(!activeRestaurant.menu || activeRestaurant.menu.length === 0) ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-1">
                    <p>No dishes in this restaurant's menu yet.</p>
                    <p className="text-[10px] text-slate-400">Use the Gemini AI Scanner above to scan and upload dishes instantly!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto no-scrollbar p-1">
                    {(activeRestaurant.menu || []).map((item) => (
                      <div key={item.id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex gap-3 items-center hover:bg-slate-50 transition-all group">
                        <img
                          referrerPolicy="no-referrer"
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="font-bold text-xs text-slate-800 truncate">{item.name}</h4>
                            <span className="text-xs font-mono font-bold text-[#f94c10] shrink-0">{item.price} {t("egp")}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>

                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <select
                              value={item.category || 'Popular'}
                              onChange={async (e) => {
                                const newCat = e.target.value;
                                try {
                                  const updatedMenu = activeRestaurant.menu.map(m =>
                                    m.id === item.id ? { ...m, category: newCat } : m
                                  );
                                  const res = await fetchWithRetry(`/api/restaurants/${activeRestaurant.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ menu: updatedMenu })
                                  });
                                  if (res.ok) {
                                    await onRefreshData();
                                    triggerSuccess('تم تحديث فئة الوجبة فورا بنجاح!');
                                  }
                                } catch (err) {
                                  console.error("Update dish category failed:", err);
                                }
                              }}
                              className="text-[9px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-1.5 py-0.5 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer uppercase transition-colors"
                            >
                              {categoriesList.filter(c => c.id !== 'all').map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {`${cat.nameAr || cat.name} ${cat.icon}`}
                                </option>
                              ))}
                            </select>
                            {item.originalPrice && (
                              <span className="text-[9px] font-bold text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded-md uppercase">
                                Deal: {item.originalPrice} {t("egp")} original
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="relative shrink-0 self-start ml-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDishDropdownId(activeDishDropdownId === item.id ? null : item.id);
                            }}
                            data-dish-menu={item.id}
                            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer transition-all flex items-center justify-center"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDishDropdownId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveDishDropdownId(null)}
                              />
                              <div className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl w-36 p-1 animate-in fade-in duration-100" style={{top: (() => { const b = document.querySelector(`[data-dish-menu="${item.id}"]`); return b ? b.getBoundingClientRect().bottom + 4 : 0; })(), right: (() => { const b = document.querySelector(`[data-dish-menu="${item.id}"]`); return b ? window.innerWidth - b.getBoundingClientRect().right : 0; })()}}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDishDropdownId(null);
                                    setDeleteConfirmDishId(item.id);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 hover:bg-red-50 text-red-650 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${'flex-row-reverse text-right'
                                    }`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  <span>{'حذف الصنف'}</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <AdminOrders ctx={{RestaurantMenuDropdown, aboutUsContentSetting, activeDishDropdownId, activeRestaurant, activeStoreDropdownId, adminEmail, adminLoginError, adminLoginLoading, adminPassword, adminTab, adminsList, aiError, aiLoading, aiWarning, captainLocations, captains, categoriesList, couponsList, currentAdmin, customInstructions, deleteConfirmAdminId, deleteConfirmDishId, deleteConfirmRestId, deliveryCommissionType, deliveryCommissionValue, deliveryOptions, deliveryPricingType, distanceBaseFee, distanceFeePerKm, dragActive, editingRestId, expandedCaptainReviews, extractedItems, fetchAdminsAndSettings, fetchCaptainsList, fileInputRef, fileName, handleAddCoupon, handleAddDeliveryOption, handleAddManualMenuItem, handleAdminLogin, handleAdminLogout, handleAdminRegister, handleCreateNewAdmin, handleDeleteAdmin, handleDeleteCaptain, handleDeleteCoupon, handleDeleteDeliveryOption, handleDeleteRestaurant, handleDrag, handleDrop, handleFileChange, handleFileParse, handleImportExtracted, handleSaveRestaurant, handleSaveSettings, handleScrollToRestaurantForm, handleSetEditRestaurant, handleSettingChange, handleToggleAdminPermission, handleToggleCoupon, handleUpdateAdminFlags, handleUpdateCaptainStatus, handleUpdateOrderCourierStatus, handleUpdateOrderFullStatus, isAdminRegisterMode, isAr, isCreatingRest, isUpdatingSettings, logoImageSetting, loyaltyCustomers, manualItemForm, newAdminForm, newCatIcon, newCatId, newCatName, newCatNameAr, newCouponCode, newCouponMinOrder, newCouponType, newCouponValue, newRegionFee, newRegionName, officeLat, officeLng, onBack, onRefreshData, ordersList, registerEmail, registerName, registerPassword, restForm, restaurants, reviews, rewardOrderThreshold, selectedFile, selectedImportItems, selectedRestId, setAboutUsContentSetting, setActiveDishDropdownId, setActiveStoreDropdownId, setAdminEmail, setAdminLoginError, setAdminLoginLoading, setAdminPassword, setAdminTab, setAdminsList, setAiError, setAiLoading, setAiWarning, setCaptainLocations, setCaptains, setCategoriesList, setCouponsList, setCurrentAdmin, setCustomInstructions, setDeleteConfirmAdminId, setDeleteConfirmDishId, setDeleteConfirmRestId, setDeliveryCommissionType, setDeliveryCommissionValue, setDeliveryOptions, setDeliveryPricingType, setDistanceBaseFee, setDistanceFeePerKm, setDragActive, setEditingRestId, setExpandedCaptainReviews, setExtractedItems, setFileName, setIsAdminRegisterMode, setIsCreatingRest, setIsUpdatingSettings, setLogoImageSetting, setLoyaltyCustomers, setManualItemForm, setNewAdminForm, setNewCatIcon, setNewCatId, setNewCatName, setNewCatNameAr, setNewCouponCode, setNewCouponMinOrder, setNewCouponType, setNewCouponValue, setNewRegionFee, setNewRegionName, setOfficeLat, setOfficeLng, setOrdersList, setRegisterEmail, setRegisterName, setRegisterPassword, setRestForm, setRewardOrderThreshold, setSelectedFile, setSelectedImportItems, setSelectedRestId, setSettingsExtra, setSuccessMsg, setWhatsappNumberSetting, settings, settingsExtra, successMsg, t, triggerSuccess, whatsappNumberSetting}} />

      <AdminCaptains ctx={{RestaurantMenuDropdown, aboutUsContentSetting, activeDishDropdownId, activeRestaurant, activeStoreDropdownId, adminEmail, adminLoginError, adminLoginLoading, adminPassword, adminTab, adminsList, aiError, aiLoading, aiWarning, captainLocations, captains, categoriesList, couponsList, currentAdmin, customInstructions, deleteConfirmAdminId, deleteConfirmDishId, deleteConfirmRestId, deliveryCommissionType, deliveryCommissionValue, deliveryOptions, deliveryPricingType, distanceBaseFee, distanceFeePerKm, dragActive, editingRestId, expandedCaptainReviews, extractedItems, fetchAdminsAndSettings, fetchCaptainsList, fileInputRef, fileName, handleAddCoupon, handleAddDeliveryOption, handleAddManualMenuItem, handleAdminLogin, handleAdminLogout, handleAdminRegister, handleCreateNewAdmin, handleDeleteAdmin, handleDeleteCaptain, handleDeleteCoupon, handleDeleteDeliveryOption, handleDeleteRestaurant, handleDrag, handleDrop, handleFileChange, handleFileParse, handleImportExtracted, handleSaveRestaurant, handleSaveSettings, handleScrollToRestaurantForm, handleSetEditRestaurant, handleSettingChange, handleToggleAdminPermission, handleToggleCoupon, handleUpdateAdminFlags, handleUpdateCaptainStatus, handleUpdateOrderCourierStatus, handleUpdateOrderFullStatus, isAdminRegisterMode, isAr, isCreatingRest, isUpdatingSettings, logoImageSetting, loyaltyCustomers, manualItemForm, newAdminForm, newCatIcon, newCatId, newCatName, newCatNameAr, newCouponCode, newCouponMinOrder, newCouponType, newCouponValue, newRegionFee, newRegionName, officeLat, officeLng, onBack, onNavigateCaptain, onRefreshData, ordersList, registerEmail, registerName, registerPassword, restForm, restaurants, reviews, rewardOrderThreshold, selectedFile, selectedImportItems, selectedRestId, setAboutUsContentSetting, setActiveDishDropdownId, setActiveStoreDropdownId, setAdminEmail, setAdminLoginError, setAdminLoginLoading, setAdminPassword, setAdminTab, setAdminsList, setAiError, setAiLoading, setAiWarning, setCaptainLocations, setCaptains, setCategoriesList, setCouponsList, setCurrentAdmin, setCustomInstructions, setDeleteConfirmAdminId, setDeleteConfirmDishId, setDeleteConfirmRestId, setDeliveryCommissionType, setDeliveryCommissionValue, setDeliveryOptions, setDeliveryPricingType, setDistanceBaseFee, setDistanceFeePerKm, setDragActive, setEditingRestId, setExpandedCaptainReviews, setExtractedItems, setFileName, setIsAdminRegisterMode, setIsCreatingRest, setIsUpdatingSettings, setLogoImageSetting, setLoyaltyCustomers, setManualItemForm, setNewAdminForm, setNewCatIcon, setNewCatId, setNewCatName, setNewCatNameAr, setNewCouponCode, setNewCouponMinOrder, setNewCouponType, setNewCouponValue, setNewRegionFee, setNewRegionName, setOfficeLat, setOfficeLng, setOrdersList, setRegisterEmail, setRegisterName, setRegisterPassword, setRestForm, setRewardOrderThreshold, setSelectedFile, setSelectedImportItems, setSelectedRestId, setSettingsExtra, setSuccessMsg, setWhatsappNumberSetting, settings, settingsExtra, successMsg, t, triggerSuccess, whatsappNumberSetting}} />

      <AdminSettings ctx={{restaurants, onBack, onRefreshData, onAdminLogin, onAdminLogout, reviews, adminsList, currentAdmin, rewardOrderThreshold, setRewardOrderThreshold, loyaltyCustomers, categoriesList, setCategoriesList, newCatId, setNewCatId, newCatNameAr, setNewCatNameAr, newCatIcon, setNewCatIcon, triggerSuccess, adminTab, whatsappNumberSetting, deliveryPricingType, distanceBaseFee, distanceFeePerKm, deliveryCommissionType, deliveryCommissionValue, aboutUsContentSetting, logoImageSetting, deliveryOptions, couponsList, isUpdatingSettings, handleSaveSettings, handleAddDeliveryOption, handleDeleteDeliveryOption, handleAddCoupon, handleToggleCoupon, handleDeleteCoupon, setWhatsappNumberSetting, setDeliveryPricingType, setDistanceBaseFee, setDistanceFeePerKm, setDeliveryCommissionType, setDeliveryCommissionValue, setAboutUsContentSetting, setLogoImageSetting, setDeliveryOptions, setCouponsList, handleSettingChange, settings, settingsExtra, officeLat, officeLng}} />

      {deleteConfirmRestId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-105" dir={'rtl'}>
            <div className="flex items-center gap-3 text-red-600">
              <div className="bg-red-50 p-2.5 rounded-2xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-805">
                {'تأكيد إزالة المطعم'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {'هل أنت متأكد من حذف هذا المطعم نهائيًا من التطبيق؟ سيتم حذف جميع الأكلات وقوائم الطعام التابعة له ولا يمكن التراجع عن هذا الإجراء.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleDeleteRestaurant(deleteConfirmRestId);
                  setDeleteConfirmRestId(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-sm transition-all"
              >
                {'نعم، احذف ⚠️'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmRestId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
              >
                {'تراجع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmDishId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-105" dir={'rtl'}>
            <div className="flex items-center gap-3 text-red-600">
              <div className="bg-red-50 p-2.5 rounded-2xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-805">
                {'تأكيد حذف الصنف'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {'هل أنت متأكد من رغبتك في حذف هذا الصنف من قائمة الطعام؟ هذا الإجراء فوري وسينعكس فورًا عند جميع المستخدمين.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const itemToDelete = activeRestaurant?.menu?.find((m: any) => m.id === deleteConfirmDishId);
                  if (itemToDelete && activeRestaurant) {
                    try {
                      const updatedMenu = activeRestaurant.menu.filter((m) => m.id !== deleteConfirmDishId);
                      const res = await fetchWithRetry(`/api/restaurants/${activeRestaurant.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ menu: updatedMenu })
                      });
                      if (res.ok) {
                        await onRefreshData();
                        const successMsg = `تم إزالة "${itemToDelete.name}" بنجاح!`;
                        triggerSuccess(successMsg);
                      }
                    } catch (err) {
                      console.error("Delete menu item failed:", err);
                    }
                  }
                  setDeleteConfirmDishId(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-sm transition-all"
              >
                {'نعم، احذف ⚠️'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmDishId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
              >
                {'تراجع'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
