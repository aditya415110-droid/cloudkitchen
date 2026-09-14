import mongoose from 'mongoose';
import Review from '../models/Review.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';

/** Recompute and store averageRating / reviewCount for one menu item. */
const refreshItemRating = async (menuItemId) => {
  const [agg] = await Review.aggregate([
    { $match: { menuItemId: new mongoose.Types.ObjectId(menuItemId), target: 'ITEM', isHidden: false } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await MenuItem.updateOne(
    { _id: menuItemId },
    {
      averageRating: agg ? Math.round(agg.average * 10) / 10 : 0,
      reviewCount: agg ? agg.count : 0,
    }
  );
};

/** True when the customer has a completed order containing this item. */
const hasPurchased = async (customerId, menuItemId) => {
  const query = { customerId, status: 'COMPLETED' };
  if (menuItemId) query['items.menuItemId'] = menuItemId;
  return Boolean(await Order.exists(query));
};

export const reviewController = {
  // Public: reviews for one menu item
  async listForItem(req, res) {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid menu item id.' });
    }

    const reviews = await Review.find({ menuItemId: id, target: 'ITEM', isHidden: false })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: reviews });
  },

  // Public: reviews of the restaurant as a whole, with a rating breakdown
  async listForRestaurant(req, res) {
    const reviews = await Review.find({ target: 'RESTAURANT', isHidden: false })
      .sort({ createdAt: -1 })
      .limit(100);

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { breakdown[r.rating] += 1; });
    const average = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    res.json({ success: true, data: { reviews, average, count: reviews.length, breakdown } });
  },

  // Customer: create or replace own review (item or restaurant)
  async upsert(req, res) {
    try {
      const { rating, comment } = req.body;
      const menuItemId = req.params.id || null;
      const target = menuItemId ? 'ITEM' : 'RESTAURANT';

      const numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be a whole number from 1 to 5.' });
      }

      if (target === 'ITEM') {
        if (!mongoose.isValidObjectId(menuItemId)) {
          return res.status(400).json({ success: false, message: 'Invalid menu item id.' });
        }
        const item = await MenuItem.findById(menuItemId);
        if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });
      }

      const review = await Review.findOneAndUpdate(
        { customerId: req.user._id, menuItemId, target },
        {
          $set: {
            target,
            menuItemId,
            customerId: req.user._id,
            customerName: req.user.name,
            customerAvatar: req.user.avatarUrl || '',
            rating: numericRating,
            comment: (comment || '').trim(),
            isVerifiedPurchase: await hasPurchased(req.user._id, menuItemId),
          },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );

      if (target === 'ITEM') await refreshItemRating(menuItemId);

      res.status(201).json({ success: true, data: review });
    } catch (error) {
      console.error('Upsert review error:', error);
      res.status(500).json({ success: false, message: 'Failed to save review.' });
    }
  },

  // Customer: the signed-in user's own reviews, keyed for quick lookup
  async myReviews(req, res) {
    const reviews = await Review.find({ customerId: req.user._id });
    res.json({ success: true, data: reviews });
  },

  // Customer: delete own review
  async remove(req, res) {
    const review = await Review.findOne({ _id: req.params.reviewId, customerId: req.user._id });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    await review.deleteOne();
    if (review.target === 'ITEM') await refreshItemRating(review.menuItemId);

    res.json({ success: true, message: 'Review deleted.' });
  },

  // Admin: every review, newest first
  async adminGetAll(req, res) {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(500);
    res.json({ success: true, data: reviews });
  },

  // Admin: hide or unhide a review
  async adminSetHidden(req, res) {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    review.isHidden = Boolean(req.body.isHidden);
    await review.save();
    if (review.target === 'ITEM') await refreshItemRating(review.menuItemId);

    res.json({ success: true, data: review });
  },

  // Admin: delete any review
  async adminRemove(req, res) {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    await review.deleteOne();
    if (review.target === 'ITEM') await refreshItemRating(review.menuItemId);

    res.json({ success: true, message: 'Review deleted.' });
  },
};
