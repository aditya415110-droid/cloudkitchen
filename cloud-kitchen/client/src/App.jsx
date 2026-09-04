import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AdminLayout from './components/layout/AdminLayout';
import { useAuth } from './context/AuthContext';

// Customer pages
import Home from './pages/customer/Home';
import Menu from './pages/customer/Menu';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import Orders from './pages/customer/Orders';
import OrderDetail from './pages/customer/OrderDetail';
import Account from './pages/customer/Account';
import Login from './pages/customer/Login';
import AuthCallback from './pages/customer/AuthCallback';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminMenu from './pages/admin/MenuManagement';
import AdminMenuForm from './pages/admin/MenuForm';
import AdminOrders from './pages/admin/OrderManagement';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import QrScanner from './pages/admin/QrScanner';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Customer routes */}
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="menu/new" element={<AdminMenuForm />} />
            <Route path="menu/:id/edit" element={<AdminMenuForm />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="scanner" element={<QrScanner />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}
