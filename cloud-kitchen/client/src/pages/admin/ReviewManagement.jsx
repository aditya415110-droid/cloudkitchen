import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiTrash2, FiStar } from 'react-icons/fi';
import { api } from '../../services/api';
import StarRating from '../../components/common/StarRating';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ITEM', label: 'Menu items' },
  { key: 'RESTAURANT', label: 'Restaurant' },
  { key: 'hidden', label: 'Hidden' },
];

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewRes, menuRes] = await Promise.all([
        api.getAdminReviews(),
        api.getAdminMenu().catch(() => ({ data: [] })),
      ]);
      setReviews(reviewRes.data || []);
      setMenuItems(menuRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reviews store only the item id, so resolve names locally for display.
  const itemNames = useMemo(
    () => new Map(menuItems.map(i => [i._id, i.name])),
    [menuItems]
  );

  const visible = reviews.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'hidden') return r.isHidden;
    return r.target === filter;
  });

  const stats = useMemo(() => {
    const shown = reviews.filter(r => !r.isHidden);
    const average = shown.length
      ? Math.round((shown.reduce((s, r) => s + r.rating, 0) / shown.length) * 10) / 10
      : 0;
    return { total: reviews.length, hidden: reviews.length - shown.length, average };
  }, [reviews]);

  const toggleHidden = async (review) => {
    try {
      await api.setReviewHidden(review._id, !review.isHidden);
      setReviews(prev => prev.map(r => r._id === review._id ? { ...r, isHidden: !r.isHidden } : r));
      toast.success(review.isHidden ? 'Review is visible again' : 'Review hidden from customers');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (review) => {
    if (!window.confirm(`Delete this review by ${review.customerName}? This cannot be undone.`)) return;
    try {
      await api.deleteReview(review._id);
      setReviews(prev => prev.filter(r => r._id !== review._id));
      toast.success('Review deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Reviews</h1>
      <p className="text-sm text-gray-500 mb-6">
        Hide a review to remove it from the customer site without deleting it.
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total reviews" value={stats.total} />
        <StatCard label="Average rating" value={stats.average || '—'} icon={<FiStar className="text-amber-400" />} />
        <StatCard label="Hidden" value={stats.hidden} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
              filter === key ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No reviews in this view.</div>
      ) : (
        <div className="space-y-3">
          {visible.map(review => (
            <div key={review._id} className={`card p-4 ${review.isHidden ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{review.customerName}</span>
                    <StarRating value={review.rating} size="sm" />
                    {review.isVerifiedPurchase && (
                      <span className="text-[11px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">
                        Verified
                      </span>
                    )}
                    {review.isHidden && (
                      <span className="text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                        Hidden
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {review.target === 'RESTAURANT'
                      ? 'Restaurant review'
                      : itemNames.get(review.menuItemId) || 'Menu item'}
                    {' · '}
                    {new Date(review.createdAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>

                  {review.comment
                    ? <p className="text-sm text-gray-700 break-words">{review.comment}</p>
                    : <p className="text-sm text-gray-400 italic">No comment left.</p>}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleHidden(review)}
                    className="p-2 text-gray-500 hover:text-brand-600"
                    title={review.isHidden ? 'Show to customers' : 'Hide from customers'}
                  >
                    {review.isHidden ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => remove(review)}
                    className="p-2 text-gray-500 hover:text-red-600"
                    title="Delete review"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold flex items-center gap-1.5">{value}{icon}</p>
    </div>
  );
}
