import React, { useState } from 'react';
import { Edit2, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import { MenuItem } from '../../types';
import { addMenuItemsToSupabase, updateMenuItemInSupabase, replaceMenuItemSizesInSupabase } from '../../services/supabaseMenuService';
import { uploadImageFile } from '../../utils/imageUpload';

const BASE_LABEL_VARIANTS = ['الوحدة الأساسية', 'الوحدة الاساسية', 'الوحدة', 'عادي', 'عادى'];

interface MenuItemEditorProps {
  item: MenuItem | null; // null = إضافة صنف جديد
  restaurantId: string;
  categoriesList: { id: string; name: string; nameAr: string; icon: string }[];
  defaultImage?: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export default function MenuItemEditor({ item, restaurantId, categoriesList, defaultImage, onClose, onSaved }: MenuItemEditorProps) {
  const initialSizes = (item?.sizes || []).map(sz => ({ id: (sz as any).id, name: sz.name, price: Number(sz.price) || 0, originalPrice: sz.originalPrice == null ? '' : Number(sz.originalPrice) }));
  // نكتشف إن كانت الوحدة الأساسية "محذوفة" مسبقًا: بنحفظها بسعر 0 تحديدًا وقت الحذف (علامة مضمونة ومش هتتلخبط بأي سعر حقيقي)
  const looksLikeBaseWasDeleted = initialSizes.length > 0 && (Number(item?.price) || 0) === 0;

  const [form, setForm] = useState<{
    name: string; description: string; price: number; originalPrice: number | ''; category: string; image: string;
    baseUnitName: string; baseUnitDeleted: boolean;
    sizes: { id?: string; name: string; price: number; originalPrice: number | '' }[];
  }>({
    name: item?.name || '',
    description: item?.description || '',
    price: Number(item?.price) || 0,
    originalPrice: item?.originalPrice == null ? '' : Number(item.originalPrice),
    category: item?.category || categoriesList.find(c => c.id !== 'all')?.id || 'أصناف متنوعة',
    image: item?.image || '',
    baseUnitName: 'الوحدة الأساسية',
    baseUnitDeleted: looksLikeBaseWasDeleted,
    sizes: initialSizes,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleSave = async () => {
    setError('');
    const finalName = form.name.trim();
    if (!finalName) { setError('اسم الصنف مطلوب.'); return; }

    // نجهّز الأحجام النهائية: الأحجام الفعلية + الوحدة الأساسية (لو اتغيّر اسمها بتتحول لحجم عادي، ولو اتمسحت بتشال خالص)
    let finalSizes = form.sizes.map(sz => ({ name: sz.name.trim(), price: Number(sz.price) || 0, originalPrice: sz.originalPrice === '' ? null : Number(sz.originalPrice) })).filter(sz => sz.name);
    const baseNameTrimmed = form.baseUnitName.trim();
    const isDefaultBaseLabel = BASE_LABEL_VARIANTS.includes(baseNameTrimmed);
    let finalPrice = form.price;
    let finalOriginalPrice: number | null = form.originalPrice === '' ? null : Number(form.originalPrice);

    if (form.baseUnitDeleted) {
      if (!finalSizes.length) { setError('لازم يفضل سعر واحد على الأقل — إما الوحدة الأساسية أو حجم واحد على الأقل.'); return; }
      finalPrice = 0; // علامة ثابتة: مفيش وحدة أساسية مستقلة، السعر بيتحدد بس من الأحجام
      finalOriginalPrice = null;
    } else if (!isDefaultBaseLabel && baseNameTrimmed) {
      // الأدمن غيّر اسم الوحدة الأساسية، فبتتحول لحجم عادي باسمه الجديد
      finalSizes = [...finalSizes, { name: baseNameTrimmed, price: Number(form.price) || 0, originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice) }];
      finalPrice = finalSizes.length ? Math.min(...finalSizes.map(s => s.price)) : finalPrice;
      finalOriginalPrice = null;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: finalName,
        description: form.description,
        price: finalPrice,
        originalPrice: finalOriginalPrice,
        category: form.category,
        image: form.image || defaultImage || '/logo.png',
      };
      if (item) {
        await updateMenuItemInSupabase(item.id, payload);
        await replaceMenuItemSizesInSupabase(item.id, finalSizes);
      } else {
        await addMenuItemsToSupabase(restaurantId, [{ ...payload, sizes: finalSizes }]);
      }
      await onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حصل خطأ أثناء الحفظ، حاول تاني.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageFile = (file: File) => {
    setIsUploadingImage(true);
    uploadImageFile(file)
      .then(url => setForm(prev => ({ ...prev, image: url })))
      .catch(err => setError(err.message || 'تعذر رفع الصورة.'))
      .finally(() => setIsUploadingImage(false));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-105 max-h-[92vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-orange-500" />
            {item ? 'تعديل الصنف' : 'إضافة صنف جديد'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">إغلاق ✕</button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold text-center">⚠️ {error}</div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">اسم الصنف</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: تشيكن رويال الأسطورية"
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">الوصف <span className="text-slate-400 font-normal">(اختياري)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="مثال: صدر دجاج مع طبقة جبنة، صوص رانش وخيار مخلل..."
              className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">الفئة</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-orange-500"
              >
                {categoriesList.filter(c => c.id !== 'all').map(cat => (
                  <option key={cat.id} value={cat.id}>{`${cat.nameAr || cat.name} ${cat.icon}`}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">صورة الصنف من الجهاز</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageFile(file); }}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-1.5 text-[10px] outline-none"
              />
            </div>
          </div>

          {(form.image || isUploadingImage) && (
            <div className="flex items-center gap-2">
              {isUploadingImage ? (
                <div className="h-14 w-14 rounded-xl border border-slate-150 bg-slate-50 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
              ) : (
                <img src={form.image} alt="معاينة الصنف" className="h-14 w-14 rounded-xl object-cover border border-slate-150" />
              )}
              <p className="text-[10px] text-slate-400">لو لم تختر صورة سيتم استخدام صورة المطعم تلقائيًا.</p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="text-xs font-bold text-slate-600 block">الأسعار والأحجام</label>

            {/* الوحدة الأساسية — سطر قابل لتغيير الاسم أو الحذف */}
            <div className={`flex items-center gap-2 p-2 rounded-xl border ${form.baseUnitDeleted ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-orange-50/50 border-orange-100'}`}>
              <input
                type="text"
                disabled={form.baseUnitDeleted}
                value={form.baseUnitName}
                onChange={(e) => setForm({ ...form, baseUnitName: e.target.value })}
                placeholder="اسم الوحدة الأساسية"
                className="flex-1 bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-xs outline-none disabled:bg-slate-100"
              />
              <input
                type="number"
                disabled={form.baseUnitDeleted}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
                className="w-20 bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-xs outline-none disabled:bg-slate-100"
              />
              {form.baseUnitDeleted ? (
                <button type="button" onClick={() => setForm({ ...form, baseUnitDeleted: false })} className="text-[10px] font-bold text-orange-600 px-2 py-1.5 cursor-pointer whitespace-nowrap">استرجاع</button>
              ) : (
                <button type="button" title="حذف الوحدة الأساسية" onClick={() => setForm({ ...form, baseUnitDeleted: true })} className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* الأحجام الإضافية */}
            {form.sizes.map((sz, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/50">
                <input
                  type="text"
                  value={sz.name}
                  onChange={(e) => {
                    const copy = [...form.sizes];
                    copy[idx] = { ...copy[idx], name: e.target.value };
                    setForm({ ...form, sizes: copy });
                  }}
                  placeholder="اسم الحجم"
                  className="flex-1 bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-xs outline-none"
                />
                <input
                  type="number"
                  value={sz.price}
                  onChange={(e) => {
                    const copy = [...form.sizes];
                    copy[idx] = { ...copy[idx], price: Number(e.target.value) || 0 };
                    setForm({ ...form, sizes: copy });
                  }}
                  className="w-20 bg-white border border-slate-150 rounded-lg px-2 py-1.5 text-xs outline-none"
                />
                <button
                  type="button"
                  title="حذف الحجم"
                  onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, i) => i !== idx) })}
                  className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setForm({ ...form, sizes: [...form.sizes, { name: '', price: 0, originalPrice: '' }] })}
              className="w-full py-2 rounded-xl border border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة حجم جديد
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            حفظ التعديلات
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
