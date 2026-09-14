import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';

/**
 * Resolve a coupon code against a subtotal and customer.
 * Returns { ok: true, coupon, discount } or { ok: false, message }.
 * Shared by the validate endpoint and order creation so the rules can never drift.
 */
export const resolveCoupon = async (code, subtotal, user) => {
  if (!code) return { ok: false, message: 'No coupon code provided.' };

  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
  if (!coupon) return { ok: false, message: 'This coupon code does not exist.' };

  const now = new Date();
  if (!coupon.isActive) return { ok: false, message: 'This coupon is no longer active.' };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, message: 'This coupon is not active yet.' };
  if (coupon.expiresAt && coupon.expiresAt <= now) return { ok: false, message: 'This coupon has expired.' };
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: 'This coupon has reached its usage limit.' };
  }
  if (subtotal < coupon.minOrderAmount) {
    return { ok: false, message: `Add items worth ₹${(coupon.minOrderAmount - subtotal).toFixed(2)} more to use this coupon.` };
  }

  if (user && coupon.perUserLimit > 0) {
    // Cancelled orders free the coupon up again.
    const used = await Order.countDocuments({
      customerId: user._id,
      'coupon.code': coupon.code,
      status: { $ne: 'CANCELLED' },
    });
    if (used >= coupon.perUserLimit) {
      return { ok: false, message: 'You have already used this coupon.' };
    }
  }

  const discount = coupon.discountFor(subtotal);
  if (discount <= 0) return { ok: false, message: 'This coupon gives no discount on your cart.' };

  return { ok: true, coupon, discount };
};

/** Public-safe projection — never leaks usage counts or internal limits. */
const publicFields = (c) => ({
  _id: c._id,
  code: c.code,
  description: c.description,
  discountType: c.discountType,
  discountValue: c.discountValue,
  maxDiscount: c.maxDiscount,
  minOrderAmount: c.minOrderAmount,
  expiresAt: c.expiresAt,
});

export const couponController = {
  // Public: coupons to advertise on the home page
  async listActive(req, res) {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      showOnHome: true,
      startsAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ createdAt: -1 });

    // isLive() also filters out coupons that have hit their global usage limit.
    res.json({ success: true, data: coupons.filter(c => c.isLive(now)).map(publicFields) });
  },

  // Customer: check a code against the current cart subtotal
  async validate(req, res) {
    const { code, subtotal } = req.body;
    const amount = Number(subtotal);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'A valid cart subtotal is required.' });
    }

    const result = await resolveCoupon(code, amount, req.user);
    if (!result.ok) return res.status(400).json({ success: false, message: result.message });

    res.json({
      success: true,
      data: { coupon: publicFields(result.coupon), discount: result.discount, total: Math.round((amount - result.discount) * 100) / 100 },
    });
  },

  // Admin: full coupon list including inactive and expired
  async adminGetAll(req, res) {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  },

  // Admin: create
  async create(req, res) {
    try {
      const coupon = await Coupon.create(buildPayload(req.body));
      broadcast(req);
      res.status(201).json({ success: true, data: coupon });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: 'A coupon with that code already exists.' });
      }
      res.status(400).json({ success: false, message: error.message || 'Failed to create coupon.' });
    }
  },

  // Admin: update
  async update(req, res) {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });

      Object.assign(coupon, buildPayload(req.body, coupon));
      await coupon.save();
      broadcast(req);
      res.json({ success: true, data: coupon });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: 'A coupon with that code already exists.' });
      }
      res.status(400).json({ success: false, message: error.message || 'Failed to update coupon.' });
    }
  },

  // Admin: delete
  async remove(req, res) {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
    broadcast(req);
    res.json({ success: true, message: 'Coupon deleted.' });
  },
};

/** Map request body to model fields, leaving untouched fields alone on update. */
function buildPayload(body, existing = null) {
  const payload = {};
  const setIf = (key, value) => { if (value !== undefined) payload[key] = value; };

  setIf('code', body.code && String(body.code).trim().toUpperCase());
  setIf('description', body.description);
  setIf('discountType', body.discountType);
  setIf('minOrderAmount', body.minOrderAmount !== undefined ? Number(body.minOrderAmount) || 0 : undefined);
  setIf('maxDiscount', body.maxDiscount !== undefined ? Number(body.maxDiscount) || 0 : undefined);
  setIf('usageLimit', body.usageLimit !== undefined ? Number(body.usageLimit) || 0 : undefined);
  setIf('perUserLimit', body.perUserLimit !== undefined ? Number(body.perUserLimit) || 0 : undefined);
  if (body.discountValue !== undefined) payload.discountValue = Number(body.discountValue);
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
  if (body.showOnHome !== undefined) payload.showOnHome = Boolean(body.showOnHome);
  if (body.startsAt !== undefined) payload.startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  if (body.expiresAt !== undefined) payload.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  // usedCount is never client-controlled.
  if (existing) delete payload.usedCount;
  return payload;
}

/** Tell connected clients to refresh the promo banner. */
function broadcast(req) {
  const io = req.app.get('io');
  if (io) io.emit('couponsUpdated');
}
