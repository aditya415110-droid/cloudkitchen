import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPackage } from 'react-icons/fi';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyOrders()
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <FiPackage size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-6">Place your first order from our menu!</p>
        <Link to="/menu" className="btn-primary">Browse Menu</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <Link key={order._id} to={`/orders/${order._id}`} className="card p-4 block hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">#{order.orderId}</span>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-600">
              {order.items.length} item{order.items.length > 1 ? 's' : ''} · ₹{order.totalAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
