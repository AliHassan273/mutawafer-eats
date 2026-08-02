import { describe, expect, it } from 'vitest';
import { calculateDeliveryBreakdown, countOrdersLast30Days, mergeMenuItems, normalizeCategory } from '../src/utils/businessRules';

describe('category rules', () => {
  it('normalizes equivalent categories', () => {
    expect(normalizeCategory('  كريب  ')).toBe('كريب');
    expect(normalizeCategory('Burgers')).toBe('burgers');
  });
});

describe('menu import rules', () => {
  it('merges duplicate base items and keeps unique sizes', () => {
    const result = mergeMenuItems(
      [{ id: '1', name: 'كريب', category: 'كريب', price: 50, sizes: [{ name: 'عادي', price: 50 }] }],
      [{ name: 'كريب', category: 'كريب', price: 60, sizes: [{ name: 'عادي', price: 50 }, { name: 'كبير', price: 60 }] }]
    );
    expect(result).toHaveLength(1);
    expect(result[0].sizes).toHaveLength(2);
  });
});

describe('delivery rules', () => {
  it('uses the selected area price and extras', () => {
    expect(calculateDeliveryBreakdown({ deliveryPricingType: 'area', deliveryOptions: [{ id: 'z', name: 'الزمالك', fee: 15 }] }, {}, 'z', true, 'vodafone')).toEqual({ deliveryFee: 15, doorstepFee: 5, paymentFee: 5 });
  });
  it('calculates distance pricing', () => {
    expect(calculateDeliveryBreakdown({ deliveryPricingType: 'distance', distanceBaseFee: 10, distanceFeePerKm: 5 }, { distance: 2 })).toEqual({ deliveryFee: 20, doorstepFee: 0, paymentFee: 0 });
  });
});

describe('loyalty rules', () => {
  it('counts only this customer and the last 30 days', () => {
    const now = Date.parse('2026-01-31T00:00:00Z');
    const orders = [
      { userId: 'u1', createdAt: '2026-01-30T00:00:00Z' },
      { userId: 'u1', createdAt: '2025-12-01T00:00:00Z' },
      { userId: 'u2', createdAt: '2026-01-30T00:00:00Z' },
    ];
    expect(countOrdersLast30Days(orders, 'u1', now)).toBe(1);
  });
});
