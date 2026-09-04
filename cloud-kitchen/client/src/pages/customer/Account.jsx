import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiUser, FiShield, FiPackage, FiLogOut } from 'react-icons/fi';

export default function Account() {
  const { user, signOut } = useAuth();

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
              <FiUser size={28} />
            </div>
          )}
          <div>
            <h2 className="font-bold text-lg">{user.name}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-gray-600">
            <FiMail size={16} /> <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <FiShield size={16} /> <span>Role: {user.role}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Link to="/orders" className="card p-4 flex items-center gap-3 hover:shadow-md transition">
          <FiPackage className="text-brand-500" size={20} />
          <span className="font-medium">My Orders</span>
        </Link>
        <button onClick={signOut} className="card p-4 flex items-center gap-3 hover:shadow-md transition w-full text-left text-red-500">
          <FiLogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
