import { useState, useEffect } from 'react';
import { FiTag, FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';

/** Human-readable discount, e.g. "20% off (up to ₹100)" or "₹50 off". */
export const describeCoupon = (c) => {
  if (!c) return '';
  const base = c.discountType === 'PERCENT' ? `${c.discountValue}% off` : `₹${c.discountValue} off`;
  const cap = c.discountType === 'PERCENT' && c.maxDiscount > 0 ? ` (up to ₹${c.maxDiscount})` : '';
  return base + cap;
};

/** Coupon entry box for the cart, with the available offers listed underneath. */
export default function CouponInput() {
  const { coupon, couponError, validatingCoupon, applyCoupon, removeCoupon, subtotal } = useCart();
  const [code, setCode] = useState('');
  const [offers, setOffers] = useState([]);
  const [showOffers, setShowOffers] = useState(false);

  useEffect(() => {
    api.getActiveCoupons()
      .then(({ data }) => setOffers(data || []))
      .catch(() => setOffers([]));
  }, []);

  const handleApply = async (e) => {
    e?.preventDefault();
    const ok = await applyCoupon(code);
    if (ok) { setCode(''); setShowOffers(false); }
  };

  if (coupon) {
    return (
      <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <FiCheck className="text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-green-800 truncate">{coupon.code} applied</p>
            <p className="text-xs text-green-700">You saved ₹{coupon.discount.toFixed(2)} — {describeCoupon(coupon)}</p>
          </div>
        </div>
        <button
          onClick={removeCoupon}
          className="text-green-700 hover:text-green-900 p-1 flex-shrink-0"
          aria-label="Remove coupon"
        >
          <FiX size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleApply} className="flex gap-2">
        <div className="relative flex-1">
          <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            className="input pl-9 uppercase"
            placeholder="Coupon code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={30}
          />
        </div>
        <button type="submit" disabled={validatingCoupon} className="btn-secondary text-sm whitespace-nowrap">
          {validatingCoupon ? 'Checking...' : 'Apply'}
        </button>
      </form>

      {couponError && <p className="text-xs text-red-600 mt-2">{couponError}</p>}

      {offers.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowOffers(v => !v)}
            className="flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700"
          >
            {offers.length} offer{offers.length === 1 ? '' : 's'} available
            <FiChevronDown size={14} className={`transition-transform ${showOffers ? 'rotate-180' : ''}`} />
          </button>

          {showOffers && (
            <ul className="mt-2 space-y-2">
              {offers.map(offer => {
                const eligible = subtotal >= offer.minOrderAmount;
                return (
                  <li
                    key={offer._id}
                    className="flex items-center justify-between gap-3 border border-dashed border-gray-300 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-sm">{offer.code}</p>
                      <p className="text-xs text-gray-600">
                        {describeCoupon(offer)}
                        {offer.minOrderAmount > 0 && ` on orders above ₹${offer.minOrderAmount}`}
                      </p>
                      {!eligible && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Add ₹{(offer.minOrderAmount - subtotal).toFixed(2)} more to use this
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!eligible || validatingCoupon}
                      onClick={() => applyCoupon(offer.code)}
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:text-gray-300 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      Apply
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
