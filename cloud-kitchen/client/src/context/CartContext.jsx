import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((menuItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItem._id);
      if (existing) {
        return prev.map(i =>
          i.menuItemId === menuItem._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.images?.[0]?.url,
        quantity: 1,
      }];
    });
  }, []);

  const removeItem = useCallback((menuItemId) => {
    setItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId, quantity) => {
    if (quantity < 1) {
      setItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
      return;
    }
    setItems(prev =>
      prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity } : i)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}
