import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiSearch } from 'react-icons/fi';

const STATUSES = ['All', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'];

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  const fetchOrders = () => {
    const params = {};
    if (statusFilter !== 'All') params.status = statusFilter;
    if (search) params.search = search;
    api.getAdminOrders(params).then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, search]);

  useEffect(() => {
    let socket;
    const connect = async () => {
      socket = await getSocket();
      socket.emit('joinAdmin');
      socket.on('newOrder', fetchOrders);
      socket.on('orderStatusChanged', fetchOrders);
    };
    connect();
    return () => { if (socket) { socket.off('newOrder'); socket.off('orderStatusChanged'); } };
  }, [statusFilter, search]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Order Management</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Search orders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition ${
                statusFilter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'All' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order ID</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${order._id}`} className="font-semibold text-brand-600 hover:underline">
                        #{order.orderId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.customerEmail}</p>
                      {order.customerPhone && (
                        <p className="text-xs text-gray-500">+91 {order.customerPhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{order.items.length} item{order.items.length > 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 font-medium">₹{order.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
