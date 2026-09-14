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
