import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function Checkout() {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">No items to checkout</h2>
        <Link to="/menu" className="btn-primary mt-4 inline-block">Browse Menu</Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderItems = items.map(i => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
      }));
      const { data } = await api.createOrder(orderItems);
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
        <div className="border-t mt-3 pt-3 flex justify-between text-lg">
          <span className="font-bold">Total</span>
          <span className="font-bold text-brand-600">₹{total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={loading}
        className="btn-primary w-full py-3 text-lg"
      >
        {loading ? 'Placing Order...' : 'Place Order'}
      </button>
      <p className="text-xs text-gray-500 mt-3 text-center">
        A confirmation email with your pickup QR code will be sent to {user.email}
      </p>
    </div>
  );
}
