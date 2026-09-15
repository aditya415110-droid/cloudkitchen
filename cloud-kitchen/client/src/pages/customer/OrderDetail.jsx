import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiCheck, FiCircle, FiMapPin, FiPhone, FiExternalLink } from 'react-icons/fi';
import { useSettings, formatAddress, mapsLink } from '../../context/SettingsContext';

const STEPS = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'];
const STEP_LABELS = { PLACED: 'Order Placed', CONFIRMED: 'Confirmed', PREPARING: 'Preparing', READY_FOR_PICKUP: 'Ready for Pickup', COMPLETED: 'Completed' };

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  const contact = settings.contact || {};
  const pickupAddress = formatAddress(settings.location);
  const pickupMaps = mapsLink(settings.location);

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
      {/* Where to collect it, straight from the admin settings. */}
      {!['CANCELLED'].includes(order.status) && (pickupAddress || contact.phone) && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">Pickup From</h2>
          <p className="font-medium mb-2">{settings.restaurantName}</p>

          {pickupAddress && (
            <div className="flex gap-2.5 text-sm mb-3">
              <FiMapPin className="text-brand-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-gray-700">{pickupAddress}</p>
                {pickupMaps && (
                  <a
                    href={pickupMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium mt-1"
                  >
                    Get directions <FiExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {contact.phone && (
            <div className="flex gap-2.5 text-sm items-center">
              <FiPhone className="text-brand-500 flex-shrink-0" size={16} />
              <a href={`tel:${contact.phone}`} className="text-brand-600 hover:text-brand-700 font-medium">
                {contact.phone}
              </a>
              <span className="text-gray-500">— call us about this order</span>
            </div>
          )}
        </div>
      )}

      {order.qrDataUrl && !['CANCELLED', 'COMPLETED'].includes(order.status) && (
        <div className="card p-6 mb-6 text-center">
          <h2 className="font-bold text-lg mb-2">Pickup QR Code</h2>
          <p className="text-sm text-gray-500 mb-4">Show this at the counter</p>
          <img src={order.qrDataUrl} alt="QR Code" className="mx-auto w-48 h-48 animate-scaleIn" />
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
        <div className="border-t mt-3 pt-3 space-y-2">
          {order.discountAmount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{(order.subtotal ?? order.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-700">
                <span>Discount {order.coupon?.code && <span className="font-mono text-xs">({order.coupon.code})</span>}</span>
                <span className="font-semibold">-₹{order.discountAmount.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg">
            <span className="font-bold">Total</span>
            <span className="font-bold text-brand-600">₹{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Ordered: {new Date(order.createdAt).toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}
