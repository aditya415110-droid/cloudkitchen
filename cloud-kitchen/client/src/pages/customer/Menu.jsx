import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiPlus, FiCheck } from 'react-icons/fi';

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { addItem, items: cartItems } = useCart();

  useEffect(() => {
    api.getMenu()
      .then(({ data }) => setItems(data))
      .catch(() => toast.error('Failed to load menu'))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', ...new Set(items.map(i => i.category))];
  const filtered = selectedCategory === 'All' ? items : items.filter(i => i.category === selectedCategory);

  const isInCart = (id) => cartItems.some(i => i.menuItemId === id);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Our Menu</h1>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedCategory === cat
                ? 'bg-brand-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No items available in this category.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(item => (
            <div key={item._id} className="card group">
              {/* Image carousel */}
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                {item.images?.length > 0 ? (
                  <ImageCarousel images={item.images} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">🍽️</div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <span className="font-bold text-brand-600 text-lg">₹{item.price}</span>
                </div>
                <p className="text-sm text-gray-500 mb-1">{item.category}</p>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                <button
                  onClick={() => { addItem(item); toast.success(`${item.name} added to cart`); }}
                  className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    isInCart(item._id)
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'btn-primary'
                  }`}
                >
                  {isInCart(item._id) ? <><FiCheck /> Add More</> : <><FiPlus /> Add to Cart</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="relative w-full h-full">
      <img src={images[idx].url} alt="" className="w-full h-full object-cover" />
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
