import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  images: [{
    url: { type: String, required: true },
    path: { type: String, required: true }, // Supabase storage path
  }],
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  /**
   * Paid extras the admin defines per item: cheese, sauces, dips and so on.
   * Each is individually priced, capped and switchable, so an extra can be
   * turned off without deleting it and losing its price.
   */
  addOns: [{
    label: { type: String, required: true, trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0 },
    // Cap per line, so nobody orders 500 by holding the + button.
    maxQuantity: { type: Number, default: 5, min: 1, max: 20 },
    enabled: { type: Boolean, default: true },
  }],

  // Denormalised review aggregates, recomputed whenever a review changes.
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Don't return soft-deleted items by default
menuItemSchema.pre('find', function () {
  if (!this.getQuery().includeDeleted) {
    this.where({ isDeleted: false });
  }
});

menuItemSchema.pre('findOne', function () {
  if (!this.getQuery().includeDeleted) {
    this.where({ isDeleted: false });
  }
});

export default mongoose.model('MenuItem', menuItemSchema);
