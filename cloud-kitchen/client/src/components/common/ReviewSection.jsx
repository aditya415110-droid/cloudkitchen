import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import StarRating from './StarRating';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

/**
 * Ratings and reviews for a single menu item, or for the restaurant when
 * `menuItemId` is omitted. Signed-in customers get one review each, editable.
 */
export default function ReviewSection({ menuItemId = null, onAverageChange }) {
  const { user, signInWithGoogle } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = menuItemId ? await api.getItemReviews(menuItemId) : await api.getRestaurantReviews();
      const list = menuItemId ? res.data : res.data.reviews;
      setReviews(list || []);

      if (onAverageChange) {
        const average = list?.length
          ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10
          : 0;
        onAverageChange(average, list?.length || 0);
      }
    } catch (err) {
      console.warn('Could not load reviews:', err.message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [menuItemId, onAverageChange]);

  useEffect(() => { load(); }, [load]);

  // Pre-fill the form when the signed-in user already reviewed this.
  const myReview = user ? reviews.find(r => r.customerId === user._id || r.customerId === user.id) : null;
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment || '');
    }
  }, [myReview?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) { toast.error('Please pick a star rating first.'); return; }

    setSubmitting(true);
    try {
      if (menuItemId) await api.reviewItem(menuItemId, rating, comment);
      else await api.reviewRestaurant(rating, comment);
      toast.success(myReview ? 'Your review was updated.' : 'Thanks for your review!');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    try {
      await api.deleteMyReview(myReview._id);
      setRating(0);
      setComment('');
      toast.success('Review removed.');
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const average = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold leading-none">{average || '—'}</p>
          <p className="text-xs text-gray-500 mt-1">{reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex-1">
          <StarRating value={average} size="md" />
          <div className="mt-2 space-y-1">
            {[5, 4, 3, 2, 1].map(star => {
              const n = reviews.filter(r => r.rating === star).length;
              const pct = reviews.length ? (n / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3">{star}</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Write a review */}
      {user ? (
        <form onSubmit={handleSubmit} className="border-t pt-4 space-y-3">
          <p className="font-semibold text-sm">{myReview ? 'Edit your review' : 'Write a review'}</p>
          <StarRating value={rating} onChange={setRating} size="lg" />
          <textarea
            className="input"
            rows={3}
            maxLength={1000}
            placeholder="How was it? (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              {submitting ? 'Saving...' : (myReview ? 'Update Review' : 'Submit Review')}
            </button>
            {myReview && (
              <button type="button" onClick={handleDelete} className="btn-secondary text-sm flex items-center gap-1">
                <FiTrash2 size={14} /> Delete
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="border-t pt-4 text-sm text-gray-600">
          <button onClick={signInWithGoogle} className="text-brand-600 font-semibold hover:underline">
            Sign in
          </button>{' '}
          to leave a review.
        </div>
      )}

      {/* Review list */}
      <div className="border-t pt-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No reviews yet — be the first!</p>
        ) : (
          reviews.map(review => (
            <div key={review._id} className="flex gap-3">
              {review.customerAvatar ? (
                <img src={review.customerAvatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {review.customerName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{review.customerName}</span>
                  {review.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">
                      <FiCheckCircle size={10} /> Verified
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <StarRating value={review.rating} size="sm" />
                {review.comment && <p className="text-sm text-gray-700 mt-1 break-words">{review.comment}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
