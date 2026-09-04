import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = () => {
    api.getAdminMenu().then(({ data }) => setItems(data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  const toggleAvailability = async (item) => {
    try {
      await api.updateMenuItemStatus(item._id, !item.isAvailable);
      toast.success(`${item.name} ${!item.isAvailable ? 'enabled' : 'disabled'}`);
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"? This will soft-delete the item.`)) return;
    try {
      await api.deleteMenuItem(item._id);
      toast.success('Item deleted');
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <Link to="/admin/menu/new" className="btn-primary flex items-center gap-2">
          <FiPlus size={18} /> Add Item
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Image</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {item.images?.[0] ? (
                      <img src={item.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg">🍽️</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.category}</td>
                  <td className="px-4 py-3 font-medium">₹{item.price}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailability(item)}
                      className={`flex items-center gap-1 text-sm font-medium ${item.isAvailable ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {item.isAvailable ? <><FiToggleRight size={20} /> Available</> : <><FiToggleLeft size={20} /> Unavailable</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/menu/${item._id}/edit`} className="p-2 text-gray-500 hover:text-brand-600 rounded-lg hover:bg-gray-100">
                        <FiEdit2 size={16} />
                      </Link>
                      <button onClick={() => deleteItem(item)} className="p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-gray-100">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No menu items yet. Add your first item!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
