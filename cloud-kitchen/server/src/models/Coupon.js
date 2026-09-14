import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 30,
    match: [/^[A-Z0-9_-]+$/, 'Coupon code may only contain letters, numbers, hyphens and underscores.'],
  },
  description: { type: String, default: '', trim: true, maxlength: 200 },
  discountType: {
    type: String,
    enum: ['PERCENT', 'FLAT'],
    required: true,
  },
  // Percent (1-100) or a flat rupee amount, depending on discountType.
  discountValue: { type: Number, required: true, min: 0 },
  // Caps a PERCENT discount. 0 or null means uncapped.
  maxDiscount: { type: Number, default: 0, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },

  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },

  // 0 means unlimited.
  usageLimit: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },

  isActive: { type: Boolean, default: true },
  // Show this coupon in the promo banner on the customer home page.
  showOnHome: { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.path('discountValue').validate(function (v) {
  return this.discountType !== 'PERCENT' || (v > 0 && v <= 100);
}, 'A percentage discount must be between 1 and 100.');

/** True when the coupon is live right now, ignoring per-order and per-user rules. */
couponSchema.methods.isLive = function (now = new Date()) {
  if (!this.isActive) return false;
  if (this.startsAt && this.startsAt > now) return false;
  if (this.expiresAt && this.expiresAt <= now) return false;
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) return false;
  return true;
};

/** Discount in rupees for a given subtotal, rounded to paise and never above the subtotal. */
couponSchema.methods.discountFor = function (subtotal) {
  let discount = this.discountType === 'PERCENT'
    ? (subtotal * this.discountValue) / 100
    : this.discountValue;

  if (this.discountType === 'PERCENT' && this.maxDiscount > 0) {
    discount = Math.min(discount, this.maxDiscount);
  }
  return Math.round(Math.min(discount, subtotal) * 100) / 100;
};

export default mongoose.model('Coupon', couponSchema);
