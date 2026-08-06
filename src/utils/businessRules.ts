export type DeliverySettings = {
  deliveryPricingType?: 'area' | 'distance';
  distanceBaseFee?: number;
  distanceFeePerKm?: number;
  deliveryOptions?: { id: string; name: string; fee: number }[];
};

export function normalizeCategory(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '');
}

export function menuBaseName(value: unknown): string {
  return normalizeCategory(value)
    .replace(/(?:^|\s)(صغير|صغيرة|ص|small|sm|وسط|وسطة|و|medium|مديوم|كبير|كبيرة|ك|large|لارج|عائلي|عائلية|family|فردي|regular)(?:\s|$)/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function mergeMenuItems(existing: any[] = [], incoming: any[] = []): any[] {
  const result = existing.map(item => ({ ...item }));
  const sizePattern = /(?:^|\s)(صغير|صغيرة|ص|small|sm|وسط|وسطة|و|medium|مديوم|كبير|كبيرة|ك|large|لارج|عائلي|عائلية|family|فردي|regular)(?:\s|$)/i;
  const baseOf = (name: any) => menuBaseName(name);
  for (const raw of incoming) {
    const item = { ...raw, id: raw.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    const base = baseOf(item.name);
    const key = `${base}::${normalizeCategory(item.category)}`;
    const index = result.findIndex(old => `${baseOf(old.name)}::${normalizeCategory(old.category)}` === key);
    const sizeMatch = String(item.name || '').match(sizePattern);
    if (index === -1) {
      if (Array.isArray(item.sizes) && item.sizes.length > 1) {
        item.sizes = item.sizes.filter((size: any) => !['الوحدة الأساسية', 'الوحدة الاساسية', 'الوحدة', 'basic', 'base', 'regular', 'عادي', 'عادى'].includes(normalizeCategory(size.name)));
      }
      result.push(item);
      continue;
    }
    const old = result[index];
    const sizes = [...(Array.isArray(old.sizes) ? old.sizes : []), ...(Array.isArray(item.sizes) ? item.sizes : [])];
    if (sizeMatch && !item.sizes?.length) sizes.push({ name: sizeMatch[1], price: item.price, originalPrice: item.originalPrice });
    let uniqueSizes = sizes.filter((size, i, list) => i === list.findIndex(x => normalizeCategory(x.name) === normalizeCategory(size.name)));
    if (uniqueSizes.length > 1) {
      uniqueSizes = uniqueSizes.filter(size => !['الوحدة الأساسية', 'الوحدة الاساسية', 'الوحدة', 'basic', 'base', 'regular', 'عادي', 'عادى'].includes(normalizeCategory(size.name)));
    }
    result[index] = { ...old, ...item, name: base || old.name, id: old.id || item.id, price: uniqueSizes.length ? Math.min(...uniqueSizes.map(x => Number(x.price) || 0)) : (old.price ?? item.price), sizes: uniqueSizes };
  }
  return result;
}

export function calculateDeliveryBreakdown(settings: DeliverySettings, restaurant: any, regionId?: string, doorstep = false, paymentMethod?: string) {
  let deliveryFee = 0;
  if (settings.deliveryPricingType === 'distance') {
    deliveryFee = Math.round((Number(settings.distanceBaseFee) || 0) + (Number(restaurant?.distance) || 0) * (Number(settings.distanceFeePerKm) || 0));
  } else {
    const region = (settings.deliveryOptions || []).find(item => String(item.id) === String(regionId));
    if (!region) throw new Error('منطقة التوصيل غير صحيحة');
    deliveryFee = Number(region.fee) || 0;
  }
  const doorstepFee = doorstep ? 5 : 0;
  const paymentFee = paymentMethod === 'vodafone' ? 5 : 0;
  return { deliveryFee: Math.max(0, deliveryFee), doorstepFee, paymentFee };
}

export function countOrdersLast30Days(orders: any[], userId: string, now = Date.now()): number {
  const since = now - 30 * 24 * 60 * 60 * 1000;
  return orders.filter(order => order.userId === userId && Date.parse(order.createdAt || '') >= since).length;
}
