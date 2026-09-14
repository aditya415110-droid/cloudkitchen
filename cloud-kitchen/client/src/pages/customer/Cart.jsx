import { Link } from 'react-router-dom';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import CouponInput from '../../components/common/CouponInput';

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, subtotal, discount, total, coupon } = useCart();
  const { settings } = useSettings();
  const isOpen = settings.openState?.isOpen !== false;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <FiShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Browse our menu and add some delicious items!</p>
        <Link to="/menu" className="btn-primary">Browse Menu</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear All</button>
      </div>

      <div className="space-y-4 mb-8">
        {items.map(item => (
          <div key={item.menuItemId} className="card p-4 flex gap-4">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">🍽️</div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{item.name}</h3>
                <button onClick={() => removeItem(item.menuItemId)} className="text-gray-400 hover:text-red-500">
                  <FiTrash2 size={16} />
                </button>
              </div>
              <p className="text-brand-600 font-medium">₹{item.price}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                >
                  <FiMinus size={14} />
                </button>
                <span className="font-semibold w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                >
                  <FiPlus size={14} />
                </button>
                <span className="ml-auto font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coupon */}
      <div className="card p-4 mb-4">
        <CouponInput />
      </div>

      {/* Summary */}
      <div className="card p-6">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between mb-2 text-green-700">
            <span>Discount {coupon?.code && <span className="font-mono text-xs">({coupon.code})</span>}</span>
            <span className="font-semibold">-₹{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t pt-4 flex justify-between text-lg">
          <span className="font-bold">Total</span>
          <span className="font-bold text-brand-600">₹{total.toFixed(2)}</span>
        </div>

        {!isOpen && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {settings.openState?.reason || 'The kitchen is closed right now.'} You can still build your cart and order once we reopen.
          </p>
        )}

        <Link
          to="/checkout"
          className={`btn-primary w-full mt-6 block text-center py-3 text-lg ${isOpen ? '' : 'pointer-events-none opacity-50'}`}
          aria-disabled={!isOpen}
        >
          {isOpen ? 'Proceed to Checkout' : 'Currently Closed'}
        </Link>
        <Link to="/menu" className="block text-center mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
