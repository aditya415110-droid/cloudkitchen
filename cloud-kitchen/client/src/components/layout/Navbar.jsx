import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiShoppingCart, FiMenu, FiX, FiUser, FiLogOut, FiPhone } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';

export default function Navbar() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { itemCount } = useCart();
  const { settings } = useSettings();
  const isOpen = settings.openState?.isOpen !== false;
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-brand-600 min-w-0">
            <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 transition-transform duration-300 hover:scale-110 hover:rotate-3" />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="truncate">{settings.restaurantName}</span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${isOpen ? 'text-green-600' : 'text-red-500'}`}
                title={isOpen ? 'Accepting orders' : (settings.openState?.reason || 'Closed')}
              >
                {isOpen ? '● Open' : '● Closed'}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/menu" className="text-gray-700 hover:text-brand-600 font-medium">Menu</Link>
            <Link to="/reviews" className="text-gray-700 hover:text-brand-600 font-medium">Reviews</Link>
            {settings.contact?.phone && (
              <a
                href={`tel:${settings.contact.phone}`}
                className="hidden lg:flex items-center gap-1.5 text-gray-700 hover:text-brand-600 font-medium"
              >
                <FiPhone size={16} /> {settings.contact.phone}
              </a>
            )}
            {user && (
              <Link to="/orders" className="text-gray-700 hover:text-brand-600 font-medium">My Orders</Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="text-gray-700 hover:text-brand-600 font-medium">Admin</Link>
            )}
            <Link to="/cart" className="relative text-gray-700 hover:text-brand-600">
              <FiShoppingCart size={22} />
              {itemCount > 0 && (
                <span
                  key={itemCount}
                  className="absolute -top-2 -right-2 bg-brand-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pop"
                >
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
                <span
                  key={itemCount}
                  className="absolute -top-2 -right-2 bg-brand-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pop"
                >
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
            <Link to="/reviews" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-brand-600 font-medium">Reviews</Link>
            {settings.contact?.phone && (
              <a href={`tel:${settings.contact.phone}`} className="flex items-center gap-2 py-2 text-gray-700 font-medium">
                <FiPhone size={16} /> {settings.contact.phone}
              </a>
            )}
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
