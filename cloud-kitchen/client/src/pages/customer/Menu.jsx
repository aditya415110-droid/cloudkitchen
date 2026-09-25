import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiPlus, FiCheck, FiSearch } from 'react-icons/fi';
import StarRating from '../../components/common/StarRating';
import MenuItemModal from '../../components/customer/MenuItemModal';
import AddOnStepper from '../../components/common/AddOnStepper';
import { ChefHatIcon, CutleryIcon } from '../../components/common/FoodGraphics';

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [activeItem, setActiveItem] = useState(null);
  // Extras selected on the card, keyed by item id, before it is added.
  const [addOnQty, setAddOnQty] = useState({});
  const { addItem, items: cartItems } = useCart();

  // Keep the grid in sync when a review is left inside the detail modal.
  const handleRatingChange = (itemId, averageRating, reviewCount) => {
    setItems(prev => prev.map(i => i._id === itemId ? { ...i, averageRating, reviewCount } : i));
    setActiveItem(prev => prev && prev._id === itemId ? { ...prev, averageRating, reviewCount } : prev);
  };

  useEffect(() => {
    api.getMenu()
      .then(({ data }) => setItems(data))
      .catch(() => toast.error('Failed to load menu'))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', ...new Set(items.map(i => i.category))];

  const query = search.trim().toLowerCase();
  const filtered = items
    .filter(i => selectedCategory === 'All' || i.category === selectedCategory)
    .filter(i => !query
      || i.name.toLowerCase().includes(query)
      || i.description?.toLowerCase().includes(query)
      || i.category.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });

  const isInCart = (id) => cartItems.some(i => i.menuItemId === id);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Our Menu</h1>

      {/* Search and sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="input pl-9"
            placeholder="Search dishes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-52" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="default">Sort: Featured</option>
          <option value="rating">Top rated</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
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
          <ChefHatIcon size={72} className="mx-auto text-brand-200 mb-4 animate-float" />
          <p className="text-lg">No items available in this category.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
          {filtered.map(item => (
            <div key={item._id} className="card card-interactive zoom-parent group flex flex-col">
              {/* Image carousel */}
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                {item.images?.length > 0 ? (
                  <ImageCarousel images={item.images} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-50">
                    <CutleryIcon size={48} className="text-brand-200" />
                  </div>
                )}
                {item.reviewCount > 0 && (
                  <span className="absolute top-2 left-2 bg-white/95 rounded-full px-2 py-1 shadow-sm">
                    <StarRating value={item.averageRating} size="sm" showValue count={item.reviewCount} />
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-1 gap-2">
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <span className="font-bold text-brand-600 text-lg whitespace-nowrap transition-transform duration-200 group-hover:scale-110">
                    ₹{item.price}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">{item.category}</p>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                <button
                  onClick={() => setActiveItem(item)}
                  className="text-sm text-brand-600 font-medium hover:text-brand-700 text-left mb-3"
                >
                  View details &amp; reviews →
                </button>
                <div className="mt-auto" />
                {item.addOns?.some(a => a.enabled) && (
                  <div className="mb-3">
                    <AddOnStepper
                      addOns={item.addOns}
                      quantities={addOnQty[item._id] || {}}
                      onChange={(addOnId, q) => setAddOnQty(prev => ({
                        ...prev,
                        [item._id]: { ...(prev[item._id] || {}), [addOnId]: q },
                      }))}
                      size="sm"
                    />
                  </div>
                )}
                <button
                  onClick={() => {
                    addItem(item, addOnQty[item._id] || {});
                    toast.success(`${item.name} added to cart`);
                    setAddOnQty(prev => ({ ...prev, [item._id]: {} }));
                  }}
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

      {activeItem && (
        <MenuItemModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onRatingChange={handleRatingChange}
        />
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
