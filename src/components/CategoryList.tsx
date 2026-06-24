import React from 'react';
import { CATEGORIES } from '../data';
import { Language, getTranslation } from '../translations';

interface CategoryListProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  lang: Language;
  categories?: { id: string; name: string; nameAr: string; icon: string }[];
}

const CATEGORY_NAMES_MAP = {
  en: {
    all: 'All Eats',
    burgers: 'Burgers',
    pizza: 'Pizza',
    salads: 'Salads',
    sushi: 'Sushi',
    ramen: 'Ramen',
    dessert: 'Dessert',
    drinks: 'Drinks',
    sides: 'Sides',
    offers: 'Special Offers'
  },
  ar: {
    all: 'كل الأكلات 🍽️',
    burgers: 'برجر بجمدان 🍔',
    pizza: 'بيتزا حكاية 🍕',
    salads: 'سلطات فريش 🥗',
    sushi: 'سوشي دلع 🍣',
    ramen: 'رامين ياباني 🍜',
    dessert: 'حلويات وفرفشة 🍦',
    drinks: 'مشروبات منعشة 🥤',
    sides: 'مقبلات جانبية 🍟',
    offers: 'عروض دمار 🏷️'
  }
};

export default function CategoryList({ selectedCategory, onSelectCategory, lang, categories }: CategoryListProps) {
  const t = (key: any, params?: any) => getTranslation(key, lang, params);

  const categoriesToRender = categories && categories.length > 0 
    ? categories 
    : [
        ...CATEGORIES,
        // Ensure "Offers" is part of list if not already
        ...(CATEGORIES.some(c => c.id === 'offers') ? [] : [{ id: 'offers', name: 'Special Offers', icon: '🏷️' }])
      ];

  return (
    <section className="px-4 md:px-8 mt-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight font-display">
            {lang === 'ar' ? 'اكتشف الأصناف المميزة 😋' : 'Explore by Category'}
          </h2>
          <button 
            onClick={() => onSelectCategory('all')} 
            className="text-xs md:text-sm font-semibold text-[#f94c10] hover:text-[#e03d08] hover:underline cursor-pointer transition-all"
          >
            {lang === 'ar' ? 'عرض الكل' : 'See All'}
          </button>
        </div>

        {/* Carousel container */}
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          {categoriesToRender.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const label = (lang === 'ar' ? (cat as any).nameAr || (CATEGORY_NAMES_MAP[lang] as any)?.[cat.id] || cat.name : (CATEGORY_NAMES_MAP[lang] as any)?.[cat.id] || cat.name);

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex flex-col items-center justify-center shrink-0 min-w-[100px] md:min-w-[125px] py-4 px-3 rounded-2xl md:rounded-3xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#f94c10] border-[#f94c10] text-white shadow-md scale-102 font-bold'
                    : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700 hover:scale-102 hover:shadow-xs'
                }`}
              >
                {/* Category Icon */}
                <div 
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center text-2xl mb-2 transition-all ${
                    isSelected ? 'bg-white/20' : 'bg-slate-50'
                  }`}
                >
                  {cat.icon}
                </div>
                {/* Category Label */}
                <span className="text-xs tracking-tight font-semibold">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
