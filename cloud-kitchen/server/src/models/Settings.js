import mongoose from 'mongoose';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// "HH:mm" in 24h form.
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dayHoursSchema = new mongoose.Schema({
  day: { type: String, enum: DAYS, required: true },
  isClosed: { type: Boolean, default: false },
  openTime: {
    type: String,
    default: '09:00',
    validate: { validator: v => TIME_RE.test(v), message: 'openTime must be HH:mm' },
  },
  closeTime: {
    type: String,
    default: '22:00',
    validate: { validator: v => TIME_RE.test(v), message: 'closeTime must be HH:mm' },
  },
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  // Singleton guard: only one settings document may ever exist.
  key: { type: String, default: 'default', unique: true, immutable: true },

  restaurantName: { type: String, default: 'LEBELL', trim: true, maxlength: 100 },
  tagline: { type: String, default: 'Fresh Food, Fast Pickup', trim: true, maxlength: 200 },

  location: {
    addressLine1: { type: String, default: '', trim: true, maxlength: 200 },
    addressLine2: { type: String, default: '', trim: true, maxlength: 200 },
    city: { type: String, default: '', trim: true, maxlength: 100 },
    state: { type: String, default: '', trim: true, maxlength: 100 },
    postalCode: { type: String, default: '', trim: true, maxlength: 20 },
    country: { type: String, default: 'India', trim: true, maxlength: 100 },
    mapsUrl: { type: String, default: '', trim: true, maxlength: 500 },
  },

  contact: {
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    alternatePhone: { type: String, default: '', trim: true, maxlength: 30 },
    whatsapp: { type: String, default: '', trim: true, maxlength: 30 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 120 },
  },

  openingHours: {
    type: [dayHoursSchema],
    default: () => DAYS.map(day => ({ day, isClosed: false, openTime: '09:00', closeTime: '22:00' })),
  },

  // IANA zone used to evaluate openingHours.
  timezone: { type: String, default: 'Asia/Kolkata', trim: true },

  // Manual override: force the kitchen closed regardless of openingHours.
  temporarilyClosed: { type: Boolean, default: false },
  closedMessage: { type: String, default: '', trim: true, maxlength: 300 },
}, { timestamps: true });

settingsSchema.statics.DAYS = DAYS;

/** Fetch the singleton settings document, creating it with defaults on first call. */
settingsSchema.statics.getSettings = async function () {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) doc = await this.create({ key: 'default' });

  // Backfill any day missing from openingHours (e.g. after a partial admin save).
  const present = new Set(doc.openingHours.map(h => h.day));
  const missing = DAYS.filter(d => !present.has(d));
  if (missing.length > 0) {
    doc.openingHours.push(...missing.map(day => ({ day, isClosed: false, openTime: '09:00', closeTime: '22:00' })));
    await doc.save();
  }
  return doc;
};

export default mongoose.model('Settings', settingsSchema);
