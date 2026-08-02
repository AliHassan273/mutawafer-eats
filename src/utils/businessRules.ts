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
  for (const raw of incoming) {
    const item = { ...raw, id: raw.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    const key = `${menuBaseName(item.name)}::${normalizeCategory(item.category)}`;
    const index = result.findIndex(old => `${menuBaseName(old.name)}::${normalizeCategory(old.category)}` === key);
    if (index === -1) {
      result.push(item);
      continue;
    }
    const old = result[index];
    const sizes = [...(Array.isArray(old.sizes) ? old.sizes : []), ...(Array.isArray(item.sizes) ? item.sizes : [])];
    const uniqueSizes = sizes.filter((size, i, list) => i === list.findIndex(x => normalizeCategory(x.name) === normalizeCategory(size.name)));
    result[index] = { ...old, ...item, id: old.id || item.id, sizes: uniqueSizes };
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
