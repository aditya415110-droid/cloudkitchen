import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiCheck, FiCircle } from 'react-icons/fi';

const STEPS = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'];
const STEP_LABELS = { PLACED: 'Order Placed', CONFIRMED: 'Confirmed', PREPARING: 'Preparing', READY_FOR_PICKUP: 'Ready for Pickup', COMPLETED: 'Completed' };

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrder(id)
      .then(({ data }) => setOrder(data))
      .finally(() => setLoading(false));
  }, [id]);

  // Real-time updates
  useEffect(() => {
    let socket;
    const connect = async () => {
      socket = await getSocket();
      socket.emit('joinOrder', id);
      socket.on('orderUpdate', (data) => {
        setOrder(prev => prev ? { ...prev, status: data.status, estimatedPickupTime: data.estimatedPickupTime ?? prev.estimatedPickupTime } : prev);
      });
    };
    connect();
    return () => {
      if (socket) {
        socket.emit('leaveOrder', id);
        socket.off('orderUpdate');
      }
    };
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="text-center py-20"><h2 className="text-xl font-bold">Order not found</h2></div>;

  const currentStep = order.status === 'CANCELLED' ? -1 : STEPS.indexOf(order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/orders" className="text-brand-600 hover:text-brand-700 text-sm font-medium mb-4 inline-block">&larr; Back to Orders</Link>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Order #{order.orderId}</h1>
          <StatusBadge status={order.status} />
        </div>

        {order.status === 'CANCELLED' ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700 font-medium">
            This order has been cancelled.
          </div>
        ) : (
          /* Timeline */
          <div className="py-4">
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={step} className="flex items-start gap-3 mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'} ${active ? 'ring-4 ring-green-100' : ''}`}>
                      {done ? <FiCheck size={16} /> : <FiCircle size={12} />}
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-0.5 h-8 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />}
                  </div>
                  <div className="pt-1">
                    <p className={`font-medium text-sm ${done ? 'text-gray-900' : 'text-gray-400'}`}>{STEP_LABELS[step]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {order.estimatedPickupTime && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
          <div className="bg-brand-50 rounded-lg p-4 text-center mt-4">
            <p className="text-sm text-gray-600">Estimated Pickup</p>
            <p className="text-lg font-bold text-brand-700">
              {new Date(order.estimatedPickupTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>

      {/* QR Code */}
      {order.qrDataUrl && !['CANCELLED', 'COMPLETED'].includes(order.status) && (
        <div className="card p-6 mb-6 text-center">
          <h2 className="font-bold text-lg mb-2">Pickup QR Code</h2>
          <p className="text-sm text-gray-500 mb-4">Show this at the counter</p>
          <img src={order.qrDataUrl} alt="QR Code" className="mx-auto w-48 h-48" />
        </div>
      )}

      {/* Items */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-3">Items</h2>
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
        <p className="text-xs text-gray-400 mt-3">Ordered: {new Date(order.createdAt).toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}
