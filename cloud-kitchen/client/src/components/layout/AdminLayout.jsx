import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { FiGrid, FiList, FiCamera, FiMenu, FiTag, FiStar, FiSettings } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [
  { to: '/admin', icon: FiGrid, label: 'Dashboard', end: true },
  { to: '/admin/menu', icon: FiMenu, label: 'Menu' },
  { to: '/admin/orders', icon: FiList, label: 'Orders' },
  { to: '/admin/scanner', icon: FiCamera, label: 'QR Scanner' },
  { to: '/admin/coupons', icon: FiTag, label: 'Coupons' },
  { to: '/admin/reviews', icon: FiStar, label: 'Reviews' },
  { to: '/admin/settings', icon: FiSettings, label: 'Settings' },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-56 bg-gray-900 text-white hidden md:block">
        <div className="p-4">
          <h2 className="font-bold text-lg text-brand-400">Admin Panel</h2>
        </div>
        <nav className="space-y-1 px-2">
          {adminLinks.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile admin nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 z-50 flex overflow-x-auto py-2 px-1">
        {adminLinks.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs gap-1 px-3 py-1 flex-shrink-0 whitespace-nowrap ${isActive ? 'text-brand-400' : 'text-gray-400'}`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>

      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 bg-gray-50 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
