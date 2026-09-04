import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPackage, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    api.getAdminOrders({}).then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    let socket;
    const connect = async () => {
      socket = await getSocket();
      socket.emit('joinAdmin');
      socket.on('newOrder', fetchOrders);
      socket.on('orderStatusChanged', fetchOrders);
    };
    connect();
    return () => {
      if (socket) { socket.off('newOrder'); socket.off('orderStatusChanged'); }
    };
  }, []);

  if (loading) return <LoadingSpinner />;

  const stats = {
    active: orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length,
    ready: orders.filter(o => o.status === 'READY_FOR_PICKUP').length,
    today: orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  };

  const recentOrders = orders.slice(0, 10);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: FiPackage, label: 'Active Orders', value: stats.active, color: 'text-blue-600 bg-blue-50' },
          { icon: FiAlertCircle, label: 'Ready for Pickup', value: stats.ready, color: 'text-green-600 bg-green-50' },
          { icon: FiClock, label: "Today's Orders", value: stats.today, color: 'text-brand-600 bg-brand-50' },
          { icon: FiCheckCircle, label: 'Completed', value: stats.completed, color: 'text-gray-600 bg-gray-100' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">Recent Orders</h2>
          <Link to="/admin/orders" className="text-brand-600 text-sm font-medium">View All</Link>
        </div>
        <div className="divide-y">
          {recentOrders.map(order => (
            <Link key={order._id} to={`/admin/orders/${order._id}`} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <span className="font-semibold">#{order.orderId}</span>
                <span className="text-gray-500 text-sm ml-2">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">₹{order.totalAmount.toFixed(2)}</span>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
          {recentOrders.length === 0 && <p className="p-4 text-gray-500 text-center">No orders yet.</p>}
        </div>
      </div>
    </div>
  );
}
