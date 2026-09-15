import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';
import { useSettings, formatAddress } from '../../context/SettingsContext';
import CouponInput from '../../components/common/CouponInput';
import toast from 'react-hot-toast';

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, discount, total, coupon, clearCart } = useCart();
  const { settings } = useSettings();
  const isOpen = settings.openState?.isOpen !== false;
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const navigate = useNavigate();

  // Indian mobile: 10 digits starting 6-9. Accept a +91 / 0 prefix and spacing
  // when typing, but send the bare 10 digits.
  const normalisedPhone = phone.replace(/[\s-]/g, '').replace(/^(\+91|0091|91|0)/, '');
  const phoneIsValid = /^[6-9]\d{9}$/.test(normalisedPhone);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">No items to checkout</h2>
        <Link to="/menu" className="btn-primary mt-4 inline-block">Browse Menu</Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!phoneIsValid) {
      setPhoneTouched(true);
      toast.error('Enter a valid 10-digit mobile number so we can reach you about this order.');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map(i => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
      }));
      const { data } = await api.createOrder(orderItems, coupon?.code || null, normalisedPhone);
      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/orders/${data._id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Customer info */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">Customer Information</h2>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">Name:</span> <span className="font-medium">{user.name}</span></p>
          <p><span className="text-gray-500">Email:</span> <span className="font-medium">{user.email}</span></p>
        </div>

        <div className="mt-4">
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Mobile number <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm">
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              className={`input rounded-l-none ${
                phoneTouched && !phoneIsValid ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              aria-invalid={phoneTouched && !phoneIsValid}
              aria-describedby="phone-help"
              maxLength={18}
            />
          </div>
          <p
            id="phone-help"
            className={`text-xs mt-1 ${phoneTouched && !phoneIsValid ? 'text-red-600' : 'text-gray-500'}`}
          >
            {phoneTouched && !phoneIsValid
              ? 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.'
              : 'We will call this number if there is a problem with your order or for confirmation.'}
          </p>
        </div>
      </div>

      {/* Order items */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">Order Summary</h2>
        <div className="divide-y">
          {items.map(item => (
            <div key={item.menuItemId} className="py-3 flex justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity} × ₹{item.price}</p>
              </div>
              <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Discount {coupon?.code && <span className="font-mono text-xs">({coupon.code})</span>}</span>
              <span className="font-semibold">-₹{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg pt-2 border-t">
            <span className="font-bold">Total</span>
            <span className="font-bold text-brand-600">₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Coupon */}
      <div className="card p-4 mb-6">
        <h2 className="font-bold text-sm mb-3">Have a coupon?</h2>
        <CouponInput />
      </div>

      {/* Pickup details */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">Pickup From</h2>
        <p className="font-medium">{settings.restaurantName}</p>
        {formatAddress(settings.location) && (
          <p className="text-sm text-gray-600 mt-1">{formatAddress(settings.location)}</p>
        )}
        {settings.contact?.phone && (
          <p className="text-sm text-gray-600 mt-1">
            Questions? Call <a href={`tel:${settings.contact.phone}`} className="text-brand-600 font-medium">{settings.contact.phone}</a>
          </p>
        )}
      </div>

      {!isOpen && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {settings.openState?.reason || 'The kitchen is closed right now.'}
          {settings.openState?.nextOpen && ` We reopen ${settings.openState.nextOpen.daysAhead === 0 ? 'today' : `on ${settings.openState.nextOpen.day}`} at ${settings.openState.nextOpen.openTime}.`}
        </p>
      )}

      <button
        onClick={handlePlaceOrder}
        disabled={loading || !isOpen || !phoneIsValid}
        className="btn-primary w-full py-3 text-lg"
      >
        {loading ? 'Placing Order...' : (isOpen ? 'Place Order' : 'Kitchen Closed')}
      </button>
      <p className="text-xs text-gray-500 mt-3 text-center">
        Your pickup QR code will be on your order page, under My Orders.
      </p>
    </div>
  );
}
