import mongoose from 'mongoose';
import Coupon from '../src/models/Coupon.js';

/** Build an unsaved Coupon document so the model's own methods can be exercised. */
const makeCoupon = (fields = {}) => new Coupon({
  code: 'TEST10',
  discountType: 'PERCENT',
  discountValue: 10,
  ...fields,
});

describe('Coupon discount calculation', () => {
  test('percentage discount', () => {
    expect(makeCoupon({ discountValue: 20 }).discountFor(500)).toBe(100);
  });

  test('percentage discount is capped by maxDiscount', () => {
    const coupon = makeCoupon({ discountValue: 50, maxDiscount: 100 });
    expect(coupon.discountFor(1000)).toBe(100); // 500 uncapped, capped to 100
    expect(coupon.discountFor(100)).toBe(50);   // below the cap, so uncapped
  });

  test('maxDiscount of 0 means no cap', () => {
    const coupon = makeCoupon({ discountValue: 50, maxDiscount: 0 });
    expect(coupon.discountFor(1000)).toBe(500);
  });

  test('flat discount', () => {
    expect(makeCoupon({ discountType: 'FLAT', discountValue: 75 }).discountFor(500)).toBe(75);
  });

  test('discount never exceeds the subtotal', () => {
    const coupon = makeCoupon({ discountType: 'FLAT', discountValue: 500 });
    expect(coupon.discountFor(200)).toBe(200);
  });

  test('results are rounded to paise', () => {
    const coupon = makeCoupon({ discountValue: 33 });
    expect(coupon.discountFor(99.99)).toBe(33);
  });
});

describe('Coupon liveness', () => {
  const now = new Date('2026-09-16T12:00:00Z');
  const hours = (n) => new Date(now.getTime() + n * 3600 * 1000);

  test('an active, in-window coupon is live', () => {
    expect(makeCoupon({ startsAt: hours(-1), expiresAt: hours(1) }).isLive(now)).toBe(true);
  });

  test('an inactive coupon is not live', () => {
    expect(makeCoupon({ isActive: false }).isLive(now)).toBe(false);
  });

  test('a coupon that has not started is not live', () => {
    expect(makeCoupon({ startsAt: hours(1) }).isLive(now)).toBe(false);
  });

  test('an expired coupon is not live', () => {
    expect(makeCoupon({ startsAt: hours(-2), expiresAt: hours(-1) }).isLive(now)).toBe(false);
  });

  test('a coupon expiring exactly now is not live', () => {
    expect(makeCoupon({ startsAt: hours(-1), expiresAt: now }).isLive(now)).toBe(false);
  });

  test('no expiry means it stays live', () => {
    expect(makeCoupon({ startsAt: hours(-1), expiresAt: null }).isLive(now)).toBe(true);
  });

  test('a coupon at its usage limit is not live', () => {
    expect(makeCoupon({ usageLimit: 5, usedCount: 5 }).isLive(now)).toBe(false);
    expect(makeCoupon({ usageLimit: 5, usedCount: 4 }).isLive(now)).toBe(true);
  });

  test('usageLimit of 0 means unlimited', () => {
    expect(makeCoupon({ usageLimit: 0, usedCount: 9999 }).isLive(now)).toBe(true);
  });
});

describe('Coupon validation rules', () => {
  test('a percentage above 100 is rejected', () => {
    const error = makeCoupon({ discountType: 'PERCENT', discountValue: 150 }).validateSync();
    expect(error?.errors?.discountValue).toBeDefined();
  });

  test('a flat discount above 100 is allowed', () => {
    const error = makeCoupon({ discountType: 'FLAT', discountValue: 150 }).validateSync();
    expect(error?.errors?.discountValue).toBeUndefined();
  });

  test('codes are uppercased and trimmed', () => {
    expect(makeCoupon({ code: '  save20  ' }).code).toBe('SAVE20');
  });

  test('a code with spaces or symbols is rejected', () => {
    expect(makeCoupon({ code: 'SAVE 20' }).validateSync()?.errors?.code).toBeDefined();
    expect(makeCoupon({ code: 'SAVE$20' }).validateSync()?.errors?.code).toBeDefined();
  });

  test('hyphens and underscores are allowed in codes', () => {
    expect(makeCoupon({ code: 'NEW_USER-20' }).validateSync()?.errors?.code).toBeUndefined();
  });

  test('a negative minimum order amount is rejected', () => {
    expect(makeCoupon({ minOrderAmount: -1 }).validateSync()?.errors?.minOrderAmount).toBeDefined();
  });
});

afterAll(async () => {
  // No connection is opened by these tests, but close defensively so Jest exits clean.
  await mongoose.disconnect().catch(() => {});
});
