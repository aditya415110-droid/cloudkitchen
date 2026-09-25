import mongoose from 'mongoose';

const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'];

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: { type: String, required: true },       // snapshot
  price: { type: Number, required: true },       // snapshot
  quantity: { type: Number, required: true, min: 1 },
  // Snapshot of the chosen extras, so later price or label edits never rewrite
  // what the customer actually ordered.
  addOns: [{
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  }],
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  customerEmail: { type: String, required: true },
  customerName: { type: String, required: true },
  // Indian mobile: 10 digits starting 6-9. Stored bare, without the +91.
  customerPhone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'],
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: [arr => arr.length > 0, 'Order must have at least one item'],
  },
  // Sum of item prices before any discount.
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  coupon: {
    code: { type: String, default: null },
    discountType: { type: String, enum: ['PERCENT', 'FLAT', null], default: null },
    discountValue: { type: Number, default: 0 },
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // subtotal - discountAmount; the amount the customer actually pays.
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: 'PLACED',
    index: true,
  },
  estimatedPickupTime: {
    type: Date,
    default: null,
  },
  qrToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  qrUsed: {
    type: Boolean,
    default: false,
  },
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: String, default: null },
  completedAt: { type: Date, default: null },
  // Track which notification emails have been sent
  emailsSent: {
    confirmation: { type: Boolean, default: false },
    ready: { type: Boolean, default: false },
    cancellation: { type: Boolean, default: false },
    adminNewOrder: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;

export default mongoose.model('Order', orderSchema);
