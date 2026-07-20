import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  Building2, Plus, Trash2, Edit2, Upload, Sparkles, Check,
  AlertCircle, ArrowLeft, Loader2, DollarSign, Tag, ClipboardList,
  MoreVertical
} from "lucide-react";
import { Restaurant, MenuItem, Review } from "../types";
import { fetchWithRetry } from "../utils/fetchHelper";
import { saveToken } from '../utils/fetchHelper';
import { lang } from '../translations';

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
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; nameAr: string; icon: string }[]>([]);
  const [newCatId, setNewCatId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatNameAr, setNewCatNameAr] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");

  // Coupons dynamic list configuration
  const [couponsList, setCouponsList] = useState<{ id: string; code: string; discountType: 'percentage' | 'flat'; discountValue: number; minOrder: number; isActive: boolean }[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'flat'>("percentage");
  const [newCouponValue, setNewCouponValue] = useState("");
  const [newCouponMinOrder, setNewCouponMinOrder] = useState("");

  // Customer orders tracked list
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [captains, setCaptains] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'stores' | 'orders' | 'captains' | 'settings'>('stores');

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
      const adRes = await fetchWithRetry("/api/admins");
      if (adRes.ok) {
        const adData = await adRes.json();
        setAdminsList(adData);

        if (adData && adData.length > 0) {
          setCurrentAdmin((prev: any) => {
            if (prev) {
              const synced = adData.find((a: any) => a.id === prev.id);
              if (synced) {
                localStorage.setItem("mutafer_logged_in_admin", JSON.stringify(synced));
                return synced;
              }
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Error loading admin accounts:", err);
    }

    try {
      const setRes = await fetchWithRetry("/api/settings");
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData) {
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
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }

    try {
      const ordRes = await fetchWithRetry("/api/orders");
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrdersList(ordData);
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
          categories: categoriesList
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
      const res = await fetchWithRetry(`/api/captains/${id}`, {
        method: "DELETE"
      });
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
    deliveryFee: 15,
    deliveryTime: "15-25 min",
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
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
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
            className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl w-40 p-1 animate-in fade-in duration-100"
            style={{
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

        const response = await fetchWithRetry("/api/gemini/parse-menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Content,
            mimeType,
            fileName: file.name,
            customInstructions: customInstructions
          })
        });

        const data = await response.json();
        if (data.success && Array.isArray(data.items)) {
          setExtractedItems(data.items);
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
    if (currentAdmin && !currentAdmin.canManageRestaurants) {
      alert("خطأ أمني: عفوًا، حسابك لا يمتلك صلاحية تعديل أو إنشاء المطاعم!");
      return;
    }
    try {
      const formattedData = {
        name: restForm.name,
        coverImage: restForm.coverImage || "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1000&q=80",
        categories: restForm.categories.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
        promo: restForm.promo || undefined,
        deliveryFee: Number(restForm.deliveryFee) || 0,
        deliveryTime: restForm.deliveryTime,
        rating: Number(restForm.rating) || 4.5,
        distance: Number(restForm.distance) || 1.0,
        descriptionString: restForm.descriptionString,
        openTime: restForm.openTime || "09:00",
        closeTime: restForm.closeTime || "23:00",
        whatsappNumber: restForm.whatsappNumber || ""
      };

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
          deliveryFee: 15,
          deliveryTime: "15-25 min",
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
    if (currentAdmin && !currentAdmin.canManageRestaurants) {
      alert("خطأ أمني: لا تملك الصلاحية اللازمة لحذف مطاعم من التطبيق!");
      return;
    }

    try {
      const res = await fetchWithRetry(`/api/restaurants/${restId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        await onRefreshData();
        setSelectedRestId(restaurants[0]?.id || "");
        triggerSuccess(t("statusDeleted"));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleAddManualMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAdmin && !currentAdmin.canManageMenu) {
      alert("خطأ أمني: لا تمتلك الصلاحية اللازمة لإضافة أو تعديل أصناف المنيو!");
      return;
    }
    if (!selectedRestId) return;

    try {
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
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
        });
        triggerSuccess("Successfully added menu option!");
      }
    } catch (err) {
      console.error("Manual add failed:", err);
    }
  };

  const handleImportExtracted = async () => {
    if (currentAdmin && !currentAdmin.canManageMenu) {
      alert("خطأ الصلاحية: لا تملك صلاحية لإدراج أو تعديل أصناف المنيو على البرنامج!");
      return;
    }
    if (!selectedRestId || extractedItems.length === 0) return;

    const itemsToImport = extractedItems
      .filter((_, idx) => selectedImportItems[idx])
      .map((item) => ({
        ...item,
        image: item.image || "/logo.png", // ✅ صورة اللوجو الافتراضية لو ما رفعش صورة
      }));
    if (itemsToImport.length === 0) {
      alert("No items selected for import");
      return;
    }

    try {
      const response = await fetchWithRetry(`/api/restaurants/${selectedRestId}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemsToImport)
      });

      if (response.ok) {
        await onRefreshData();
        setExtractedItems([]);
        setFileName(null);
        triggerSuccess(t("addedSuccess"));
      }
    } catch (err) {
      console.error("AI dishes import failed:", err);
    }
  };

  const handleSetEditRestaurant = (rest: Restaurant) => {
    if (currentAdmin && !currentAdmin.canManageRestaurants) {
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
      deliveryFee: 15,
      deliveryTime: "15-25 min",
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
      {currentAdmin?.role === 'primary' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50 border border-slate-100 rounded-3xl p-6">
          {/* Section 1: WhatsApp, general settings and custom pricing for delivery */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <span className="text-lg">⚙️</span>
              <div>
                <h3 className="text-sm font-black text-slate-800">شحن التوصيل وإشعارات الواتساب والعمولات والتعريف</h3>
                <p className="text-[10px] text-slate-400">تحكم بأسعار الدليفري، عمولة الكابتن، تعيين وتساب التوجيه، ووصف المكان.</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* WhatsApp Receiver Number */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 block">رقم وتساب استلام الطلبات الرئيسي:</label>
                <input
                  type="text"
                  required
                  placeholder="201016789012"
                  value={whatsappNumberSetting}
                  onChange={(e) => setWhatsappNumberSetting(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#f94c10]/20 font-bold"
                />
                <span className="text-[10px] text-slate-400 block">الرجاء إدخال الرقم بكود الدولة بدون أي فواصل أو علامات زائد (مثال: 201016789012).</span>
              </div>

              {/* Delivery Pricing Type */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-black text-slate-700 block">طريقة حساب سعر شحن التوصيل للعميل:</label>
                <select
                  value={deliveryPricingType}
                  onChange={(e) => setDeliveryPricingType(e.target.value as 'area' | 'distance')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#f94c10]/20 font-black text-slate-800"
                >
                  <option value="area">شحن حسب المنطقة (قائمة أسعار كل منطقة بالأسفل) 🗺️</option>
                  <option value="distance">شحن حسب المسافة (تلقائي وبدقة عبر الخريطة) 📍</option>
                </select>
              </div>

              {/* Distance-based values */}
              {deliveryPricingType === 'distance' && (
                <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-[10px] text-orange-700 font-bold">💡 سيتم تحديد سعر شحن التوصيل تلقائياً بضرب المسافة بين العميل والمطعم بعامل السعر المضاف أدناه. العميل هيشوف خريطة وقت الطلب يحدد موقعه.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 block">رسوم فتحة الدليفري الأساسية (جنيه):</label>
                      <input
                        type="number"
                        min={0}
                        value={distanceBaseFee}
                        onChange={(e) => setDistanceBaseFee(Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500/10 outline-none font-bold text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 block">سعر الكيلومتر المضاف (جنيه):</label>
                      <input
                        type="number"
                        min={0}
                        value={distanceFeePerKm}
                        onChange={(e) => setDistanceFeePerKm(Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500/10 outline-none font-bold text-center"
                      />
                    </div>
                  </div>
                  {/* موقع مكتب الشركة / نقطة الانطلاق */}
                  <div className="space-y-1 border-t border-orange-100 pt-3">
                    <label className="text-[10px] font-black text-slate-600 block">📍 موقع نقطة الانطلاق (مكتب الشركة):</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[9px] text-slate-400 font-bold">خط العرض (Lat)</label>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="30.0626"
                          value={(settings as any)?.officeLat || ''}
                          onChange={(e) => handleSettingChange('officeLat', parseFloat(e.target.value) || 30.0626)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none font-mono text-center"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] text-slate-400 font-bold">خط الطول (Lng)</label>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="31.2222"
                          value={(settings as any)?.officeLng || ''}
                          onChange={(e) => handleSettingChange('officeLng', parseFloat(e.target.value) || 31.2222)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none font-mono text-center"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          handleSettingChange('officeLat', pos.coords.latitude);
                          handleSettingChange('officeLng', pos.coords.longitude);
                          triggerSuccess('تم تحديد موقع المكتب من GPS! 📍');
                        });
                      }}
                      className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-[10px] py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      📍 استخدم موقعي الحالي كنقطة انطلاق
                    </button>
                  </div>
                </div>
              )}

              {/* Delivery Driver Commission */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-705 block">طريقة احتساب عمولة كابتن التوصيل (الدليفري):</label>
                  <select
                    value={deliveryCommissionType}
                    onChange={(e) => setDeliveryCommissionType(e.target.value as 'flat' | 'percentage')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#f94c10]/20 font-black text-slate-800"
                  >
                    <option value="flat">مبلغ ثابت عن كل أوردر توصيل (جنيه) 💵</option>
                    <option value="percentage">نسبة مئوية من إجمالي الأكل (%) 📈</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 block">قيمة عمولة الكابتن المستحقة:</label>
                  <input
                    type="number"
                    min={0}
                    value={deliveryCommissionValue}
                    onChange={(e) => setDeliveryCommissionValue(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#f94c10]/10 font-bold"
                  />
                  <span className="text-[9px] text-[#f94c10] font-black block">
                    {deliveryCommissionType === 'flat'
                      ? `يحصل الدليفري على ${deliveryCommissionValue} جنيه ثابتة عن كل مشوار.`
                      : `يحصل الدليفري على ${deliveryCommissionValue}% من قيمة الأكل بالطلب كمستحق عمولة.`}
                  </span>
                </div>
              </div>

              {/* About Us Page Content Profile */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <label className="text-xs font-black text-slate-705 block">تعديل محتوى صفحة "تعريف عن المكان / من نحن" 💬:</label>
                <textarea
                  required
                  value={aboutUsContentSetting}
                  onChange={(e) => setAboutUsContentSetting(e.target.value)}
                  placeholder="اكتب هنا تاريخ مطعمك أو شعار وهدف تطبيقك..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#f94c10]/20 font-semibold h-24 resize-none leading-relaxed text-slate-700"
                />
              </div>

              {/* Dynamic Categories Manager */}
              <div className="border-t border-slate-100 pt-4 space-y-3" dir="rtl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 block">🛍️ إدارة أقسام وفئات الطعام بالتطبيق (اكتشف الأصناف المميزة):</label>
                  <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">{categoriesList.length} أقسام</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categoriesList.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-1.5 hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base shrink-0">{cat.icon}</span>
                        <div className="min-w-0 leading-tight">
                          <p className="text-[10px] font-black text-slate-800 truncate">{cat.nameAr || cat.name}</p>
                          <p className="text-[8px] font-semibold text-slate-400 truncate">{cat.id}</p>
                        </div>
                      </div>
                      {cat.id !== 'all' && cat.id !== 'offers' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoriesList(categoriesList.filter(c => c.id !== cat.id));
                            triggerSuccess('تم حذف القسم مؤقتاً بالمسودة! اضغط على زر الحفظ بالأسفل للتنفيذ.');
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-bold p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="حذف الفئة"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-xl p-3.5 space-y-3">
                  <p className="text-[10px] font-black text-amber-600 block">➕ إضافة فئة/قسم طعام جديد للقائمة:</p>
                  <div className="grid grid-cols-2 gap-3 text-right">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-500 block">معرف الفئة (ID بالإنجليزي بدون فواصل) *</span>
                      <input
                        type="text"
                        placeholder="مثال: desserts"
                        value={newCatId}
                        onChange={(e) => setNewCatId(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-500 block">رمز الإيموجي (Emoji) *</span>
                      <input
                        type="text"
                        placeholder="مثال: 🍦"
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-center outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-500 block">الاسم بالإنجليزية (Name EN) *</span>
                      <input
                        type="text"
                        placeholder="e.g. Desserts"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-500 block">الاسم بالعربية (Name AR) *</span>
                      <input
                        type="text"
                        placeholder="مثال: حلويات وفرفشة"
                        value={newCatNameAr}
                        onChange={(e) => setNewCatNameAr(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-right font-bold"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCatId || !newCatName || !newCatNameAr || !newCatIcon) {
                        alert('يرجى ملء جميع حقول إضافة الفئة الجديدة أولاً!');
                        return;
                      }
                      if (categoriesList.some(c => c.id === newCatId)) {
                        alert('هذا المعرف مستخدم بالفعل!');
                        return;
                      }
                      const updated = [
                        ...categoriesList,
                        { id: newCatId, name: newCatName, nameAr: newCatNameAr, icon: newCatIcon }
                      ];
                      setCategoriesList(updated);
                      setNewCatId("");
                      setNewCatName("");
                      setNewCatNameAr("");
                      setNewCatIcon("");
                      triggerSuccess('تمت إضافة القسم للمسودة بنجاح! اضغط على زر الحفظ بالأسفل للاعتماد.');
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    أضف كقسم جديد لقائمة المعروضات ➕
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingSettings}
                className="w-full bg-[#f94c10] hover:bg-[#e03d08] text-white rounded-xl py-2.5 px-5 text-xs font-black cursor-pointer transition-all duration-150 select-none shadow hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
              >
                <span>{isUpdatingSettings ? "جاري التحديث والحفظ..." : "تحديث وحفظ الإعدادات كاملة 💾"}</span>
              </button>
            </form>
          </div>

          {/* Section 2: Administrations Account and Custom toggles */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-4">
            <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-2">👤 التحكم في حسابات المشرفين المساعدين وصلاحياتهم</h3>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {adminsList.map((admin) => (
                <div key={admin.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">{admin.name}</span>
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        {admin.role === 'primary' ? 'مدير أساسي تام الصلاحيات' : 'مشرف مساعد'}
                      </span>
                    </div>
                    {admin.role !== 'primary' && (
                      deleteConfirmAdminId === admin.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteAdmin(admin.id, admin.name);
                              setDeleteConfirmAdminId(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1 text-[9px] font-black cursor-pointer shadow-sm"
                          >
                            تأكيد الحذف ⚠️
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmAdminId(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-2 py-1 text-[9px] font-bold cursor-pointer"
                          >
                            تراجع
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmAdminId(admin.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          حذف الحساب 🗑️
                        </button>
                      )
                    )}
                  </div>

                  {admin.role !== 'primary' ? (
                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleToggleAdminPermission(admin.id, 'canManageRestaurants')}
                        className={`py-1 px-1.5 text-[9px] rounded-md font-bold transition-all border ${admin.canManageRestaurants
                            ? "bg-orange-50 border-orange-200 text-[#f94c10]"
                            : "bg-white border-slate-200 text-slate-400"
                          }`}
                      >
                        🏪 المطاعم
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAdminPermission(admin.id, 'canManageMenu')}
                        className={`py-1 px-1.5 text-[9px] rounded-md font-bold transition-all border ${admin.canManageMenu
                            ? "bg-[#f94c10]/10 border-[#f94c10]/20 text-[#f94c10]"
                            : "bg-white border-slate-200 text-slate-400"
                          }`}
                      >
                        📝 المنيو والأصناف
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAdminPermission(admin.id, 'canUseAIScanner')}
                        className={`py-1 px-1.5 text-[9px] rounded-md font-bold transition-all border ${admin.canUseAIScanner
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-400"
                          }`}
                      >
                        🪄 الذكاء الاصطناعي
                      </button>
                    </div>
                  ) : (
                    <p className="text-[9px] text-amber-650 font-bold bg-amber-50 rounded p-1.5 text-center mt-1">🔑 هذا هو حسابك النشط كمدير عام للبرنامج. كل الصلاحيات مفعلة تلقائياً.</p>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateNewAdmin} className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <span className="text-[10px] font-black text-slate-400">إضافة عضو إدارة مساعد جديد:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="الاسم كامل..."
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
                <input
                  type="email"
                  required
                  placeholder="البريد الإلكتروني..."
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
                <input
                  type="text"
                  required
                  placeholder="الرمز السري..."
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 px-4 text-xs font-bold w-full cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all mt-1"
              >
                إضافة وإدراج المشرف الجديد 👥
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 flex items-center gap-3">
          <span className="text-xl">🔒</span>
          <div className="text-right">
            <h4 className="text-xs font-black text-slate-755">أنت مسجل كمشرف مساعد باسم: {currentAdmin?.name}</h4>
            <p className="text-[10px] text-slate-500">حسابك الحالي لا يمتلك صلاحية المدير الأساسي للتحكم في حسابات بقية المشرفين أو تعديل شفرة إشعارات الواتساب الأساسية.</p>
          </div>
        </div>
      )}

      {/* Floating Success Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="h-5 w-5 bg-white/20 rounded-full p-0.5" />
          <span className="text-xs sm:text-sm font-bold">{successMsg}</span>
        </div>
      )}

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
                    const reader = new FileReader();
                    reader.onload = (ev) => setRestForm({ ...restForm, coverImage: ev.target?.result as string, _coverFile: file });
                    reader.readAsDataURL(file);
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
            <label className="text-xs font-bold text-slate-600">{t("categoryTags")} *</label>
            <input
              required
              type="text"
              placeholder="burgers, pizza, dessert..."
              value={restForm.categories}
              onChange={(e) => setRestForm({ ...restForm, categories: e.target.value })}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500"
            />
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
            <label className="text-xs font-bold text-slate-600">{t("deliveryTime")}</label>
            <input
              type="text"
              value={restForm.deliveryTime}
              onChange={(e) => setRestForm({ ...restForm, deliveryTime: e.target.value })}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">{t("deliveryFee")} ({t("egp")})</label>
            <input
              type="number"
              value={restForm.deliveryFee}
              onChange={(e) => setRestForm({ ...restForm, deliveryFee: Number(e.target.value) })}
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
                <span>Add Dish Manually</span>
              </h3>

              <form onSubmit={handleAddManualMenuItem} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Dish Name</label>
                  <input
                    required
                    type="text"
                    value={manualItemForm.name}
                    onChange={(e) => setManualItemForm({ ...manualItemForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
                  <textarea
                    required
                    placeholder="Yummy details..."
                    value={manualItemForm.description}
                    onChange={(e) => setManualItemForm({ ...manualItemForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Price ({t("egp")})</label>
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

                <button
                  type="submit"
                  className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Add Item to Menu</span>
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
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                          const copy = [...extractedItems];
                                          copy[idx].image = ev.target?.result as string;
                                          setExtractedItems(copy);
                                        };
                                        reader.readAsDataURL(file);
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
                                  <select
                                    value={item.category?.toLowerCase?.() || item.category}
                                    onChange={(e) => {
                                      const copy = [...extractedItems];
                                      copy[idx].category = e.target.value;
                                      setExtractedItems(copy);
                                    }}
                                    className="px-1.5 py-1 bg-slate-900 border border-slate-800 rounded outline-none text-[10px] font-bold text-slate-200 cursor-pointer"
                                  >
                                    <option value="burgers">🍔 برجر</option>
                                    <option value="pizza">🍕 بيتزا</option>
                                    <option value="salads">🥗 سلطات</option>
                                    <option value="sushi">🍣 سوشي</option>
                                    <option value="ramen">🍜 رامن</option>
                                    <option value="dessert">🍦 حلويات</option>
                                    <option value="sides">🍟 مقبلات</option>
                                    <option value="drinks">🥤 مشروبات</option>
                                    <option value="offers">🎁 عروض</option>
                                  </select>
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
                    <span>{activeRestaurant.name} • Menu Options ({activeRestaurant.menu?.length || 0})</span>
                  </h3>

                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                    Rating: {activeRestaurant.rating} ★
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

      {/* Tab 2: Orders Approved/Live Tracking Dashboard */}
      {adminTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 mb-2">
              <span>📦</span>
              <span>{isAr ? 'موافقة وإشراف الطلبات المعلقة' : 'Pending & Live Orders'}</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {isAr
                ? 'تحكم في سريان الطلبات: العميل عندما يطلب يتحول طلبه أولاً لحالة "معلق بالإدارة" ويتم التوجيه للواتساب، لتقوم بقبولها من هنا وتمريرها للمطابخ وتعيين كابتن توصيل نشط!'
                : 'Manage the flow of customer orders here. Incoming orders start as "Pending". Approve them to send to the kitchen, and designate active Captains!'}
            </p>

            {ordersList.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold">
                {isAr ? 'لا يوجد أي طلبات مسجلة في التطبيق حالياً!' : 'No orders recorded in the platform.'}
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
                            {order.restaurant.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-850 border border-sky-200'
                            }`}>
                            {order.status === 'Pending' && (isAr ? '⏳ قيد مراجعة وموافقة المدير' : 'Pending Approval')}
                            {order.status === 'Received' && (isAr ? '👍 تم القبول (بانتظار المطبخ)' : 'Received')}
                            {order.status === 'Preparing' && (isAr ? '👨‍🍳 يطبخ حالياً بالمطبخ' : 'Preparing')}
                            {order.status === 'OutForDelivery' && (isAr ? '🛵 في الطريق مع الطيار' : 'Out For Delivery')}
                            {order.status === 'Delivered' && (isAr ? '🥰 تم التوصيل للعميل' : 'Delivered')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-650 leading-relaxed">
                        <div className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
                          <p className="font-extrabold text-slate-800 mb-2 border-b border-slate-100 pb-1">🍕 الأصناف والوجبات:</p>
                          <ul className="space-y-1">
                            {order.items.map((item: any, idx: number) => {
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
                                <option value={JSON.stringify({ name: `${currentAdmin.name} (آدمن)`, phone: currentAdmin.phone || '01016789012' })}>
                                  👑 نفسي ({currentAdmin.name} - الآدمن الحالي)
                                </option>
                              )}
                              {adminsList.filter(a => a.id !== currentAdmin?.id).map((admin: any) => (
                                <option key={`admin-select-${admin.id}`} value={JSON.stringify({ name: `${admin.name} (آدمن)`, phone: admin.phone || '01012345678' })}>
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
                    const res = await fetchWithRetry('/api/captain/locations/all');
                    if (res.ok) {
                      const locs = await res.json();
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

      {/* Tab 4: DELIVERY AREAS & PROMO COUPONS SETTINGS */}
      {adminTab === 'settings' && (
        <div className="space-y-6">
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
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setLogoImageSetting(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
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