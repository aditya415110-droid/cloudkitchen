import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickupTime, setPickupTime] = useState('');

  const fetchOrder = () => {
    api.getAdminOrder(id).then(({ data }) => {
      setOrder(data);
      if (data.estimatedPickupTime) {
        const d = new Date(data.estimatedPickupTime);
        setPickupTime(d.toISOString().slice(0, 16));
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleStatusChange = async (status) => {
    try {
      await api.updateOrderStatus(id, status);
      toast.success(`Status updated to ${status}`);
      fetchOrder();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTimeUpdate = async () => {
    try {
      await api.updateEstimatedTime(id, new Date(pickupTime).toISOString());
      toast.success('Pickup time updated');
      fetchOrder();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this order? This action cannot be undone.')) return;
    try {
      await api.cancelOrder(id);
      toast.success('Order cancelled');
      fetchOrder();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleComplete = async () => {
    try {
      await api.completeOrder(id);
      toast.success('Order completed');
      fetchOrder();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="text-center py-20"><h2 className="text-xl font-bold">Order not found</h2></div>;

  const isFinal = ['COMPLETED', 'CANCELLED'].includes(order.status);

  return (
    <div className="max-w-3xl">
      <Link to="/admin/orders" className="text-brand-600 text-sm font-medium mb-4 inline-block">&larr; Back to Orders</Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Order #{order.orderId}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Customer info */}
        <div className="card p-5">
          <h2 className="font-bold mb-3">Customer</h2>
          <p className="font-medium">{order.customerName}</p>
          <p className="text-sm text-gray-500">{order.customerEmail}</p>
          <p className="text-xs text-gray-400 mt-2">Order placed: {new Date(order.createdAt).toLocaleString('en-IN')}</p>
        </div>

        {/* Status management */}
        <div className="card p-5">
          <h2 className="font-bold mb-3">Update Status</h2>
          {isFinal ? (
            <p className="text-sm text-gray-500">This order is {order.status.toLowerCase()}.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {STATUSES.filter(s => s !== order.status).map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-brand-100 hover:text-brand-700 transition"
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Estimated pickup time */}
      {!isFinal && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold mb-3">Estimated Pickup Time</h2>
          <div className="flex gap-3">
            <input
              type="datetime-local"
              className="input flex-1"
              value={pickupTime}
              onChange={e => setPickupTime(e.target.value)}
            />
            <button onClick={handleTimeUpdate} className="btn-primary">Update</button>
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold mb-3">Items</h2>
        <div className="divide-y">
          {order.items.map((item, i) => (
            <div key={i} className="py-3 flex justify-between">
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
          <span className="font-bold text-brand-600">₹{order.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      {!isFinal && (
        <div className="flex gap-3">
          <button onClick={handleComplete} className="btn-primary flex-1">Mark as Completed</button>
          <button onClick={handleCancel} className="btn-danger">Cancel Order</button>
        </div>
      )}
    </div>
  );
}
