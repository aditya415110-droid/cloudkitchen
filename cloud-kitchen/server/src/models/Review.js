import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  // 'ITEM' reviews rate a single menu item; 'RESTAURANT' reviews rate the kitchen overall.
  target: {
    type: String,
    enum: ['ITEM', 'RESTAURANT'],
    required: true,
    index: true,
  },
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    default: null,
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  customerName: { type: String, required: true, trim: true },
  customerAvatar: { type: String, default: '' },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: { validator: Number.isInteger, message: 'Rating must be a whole number from 1 to 5.' },
  },
  comment: { type: String, default: '', trim: true, maxlength: 1000 },
  // Set when the reviewer has a COMPLETED order containing this item.
  isVerifiedPurchase: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },
}, { timestamps: true });

// One review per customer per menu item, and one restaurant review per customer.
reviewSchema.index({ customerId: 1, menuItemId: 1, target: 1 }, { unique: true });

reviewSchema.pre('validate', function (next) {
  if (this.target === 'ITEM' && !this.menuItemId) {
    return next(new Error('menuItemId is required for item reviews.'));
  }
  if (this.target === 'RESTAURANT') this.menuItemId = null;
  next();
});

export default mongoose.model('Review', reviewSchema);
