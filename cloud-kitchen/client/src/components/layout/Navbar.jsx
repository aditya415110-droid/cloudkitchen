import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiShoppingCart, FiMenu, FiX, FiUser, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-600">
            <span className="text-2xl">🍽️</span> CloudKitchen
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/menu" className="text-gray-700 hover:text-brand-600 font-medium">Menu</Link>
            {user && (
              <Link to="/orders" className="text-gray-700 hover:text-brand-600 font-medium">My Orders</Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="text-gray-700 hover:text-brand-600 font-medium">Admin</Link>
            )}
            <Link to="/cart" className="relative text-gray-700 hover:text-brand-600">
              <FiShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/account" className="flex items-center gap-2 text-gray-700 hover:text-brand-600">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <FiUser size={20} />
                  )}
                  <span className="font-medium text-sm">{user.name}</span>
                </Link>
                <button onClick={signOut} className="text-gray-500 hover:text-red-500" title="Sign out">
                  <FiLogOut size={18} />
                </button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className="btn-primary text-sm">Sign in with Google</button>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-4">
            <Link to="/cart" className="relative text-gray-700">
              <FiShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-700">
              {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/menu" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-brand-600 font-medium">Menu</Link>
            {user && (
              <Link to="/orders" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-brand-600 font-medium">My Orders</Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-brand-600 font-medium">Admin Dashboard</Link>
            )}
            {user ? (
              <>
                <Link to="/account" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-brand-600 font-medium">Account</Link>
                <button onClick={() => { signOut(); setMenuOpen(false); }} className="block py-2 text-red-500 font-medium">Sign Out</button>
              </>
            ) : (
              <button onClick={signInWithGoogle} className="btn-primary w-full text-sm mt-2">Sign in with Google</button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
