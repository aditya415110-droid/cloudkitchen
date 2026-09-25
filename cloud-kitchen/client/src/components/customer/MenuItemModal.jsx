import { useEffect, useState } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import StarRating from '../common/StarRating';
import AddOnStepper from '../common/AddOnStepper';
import { CutleryIcon } from '../common/FoodGraphics';
import ReviewSection from '../common/ReviewSection';
import { useCart } from '../../context/CartContext';

/** Full detail view for one menu item: images, description, and its reviews. */
export default function MenuItemModal({ item, onClose, onRatingChange }) {
  const { addItem } = useCart();
  const [addOnQty, setAddOnQty] = useState({});

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto relative animate-fadeUp sm:animate-scaleIn"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white/90 rounded-full p-2 text-gray-600 hover:text-gray-900 shadow"
          aria-label="Close"
        >
          <FiX size={18} />
        </button>

        {item.images?.length > 0 ? (
          <div className="flex gap-1 overflow-x-auto snap-x bg-gray-100">
            {item.images.map(img => (
              <img key={img.path} src={img.url} alt="" className="h-56 w-full object-cover flex-shrink-0 snap-center" />
            ))}
          </div>
        ) : (
          <div className="h-40 bg-brand-50 flex items-center justify-center">
            <CutleryIcon size={56} className="text-brand-200" />
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{item.name}</h2>
              <span className="text-xl font-bold text-brand-600 whitespace-nowrap">₹{item.price}</span>
            </div>
            <p className="text-sm text-gray-500">{item.category}</p>
            <div className="mt-2">
              <StarRating value={item.averageRating || 0} size="sm" showValue count={item.reviewCount || 0} />
            </div>
          </div>

          <p className="text-gray-700 whitespace-pre-line">{item.description}</p>

          {item.addOns?.some(a => a.enabled) && (
            <AddOnStepper
              addOns={item.addOns}
              quantities={addOnQty}
              onChange={(addOnId, q) => setAddOnQty(prev => ({ ...prev, [addOnId]: q }))}
            />
          )}

          <button
            onClick={() => {
              addItem(item, addOnQty);
              toast.success(`${item.name} added to cart`);
              setAddOnQty({});
            }}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            <FiPlus /> Add to Cart
          </button>

          <div className="border-t pt-5">
            <h3 className="font-bold mb-4">Ratings &amp; Reviews</h3>
            <ReviewSection
              menuItemId={item._id}
              onAverageChange={(average, count) => onRatingChange?.(item._id, average, count)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
