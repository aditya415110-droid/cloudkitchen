import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../services/api';

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

const STORAGE_KEY = 'ck_cart';

const readStoredCart = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);
  // The coupon the customer has applied, plus the discount the server quoted for it.
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  /** Item price times quantity, plus every paid extra chosen on that line. */
  const lineTotal = (i) =>
    i.price * i.quantity + (i.addOns || []).reduce((sum, a) => sum + a.price * (a.quantity || 0), 0);

  const subtotal = useMemo(
    () => Math.round(items.reduce((sum, i) => sum + lineTotal(i), 0) * 100) / 100,
    [items]
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage may be full or blocked; the in-memory cart still works.
    }
  }, [items]);

  const addItem = useCallback((menuItem, addOnQuantities = {}) => {
    // Snapshot the offered extras so the cart can price and cap them without
    // refetching. Disabled ones are dropped at the point of adding.
    const offered = (menuItem.addOns || [])
      .filter(a => a.enabled)
      .map(a => ({
        addOnId: a._id,
        label: a.label,
        price: a.price,
        maxQuantity: a.maxQuantity,
        quantity: Math.min(Math.max(0, addOnQuantities[a._id] || 0), a.maxQuantity),
      }));

    setItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItem._id);
      if (existing) {
        return prev.map(i => {
          if (i.menuItemId !== menuItem._id) return i;
          // Merge the newly chosen extras into whatever the line already had.
          const merged = (i.addOns || []).map(a => {
            const added = offered.find(o => o.addOnId === a.addOnId);
            return added
              ? { ...a, quantity: Math.min(a.quantity + added.quantity, a.maxQuantity) }
              : a;
          });
          return { ...i, quantity: i.quantity + 1, addOns: merged };
        });
      }
      return [...prev, {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.images?.[0]?.url,
        quantity: 1,
        addOns: offered,
      }];
    });
  }, []);

  /** Change how many of one extra are on a cart line. */
  const updateAddOnQuantity = useCallback((menuItemId, addOnId, quantity) => {
    setItems(prev => prev.map(i => {
      if (i.menuItemId !== menuItemId) return i;
      return {
        ...i,
        addOns: (i.addOns || []).map(a =>
          a.addOnId === addOnId
            ? { ...a, quantity: Math.min(Math.max(0, quantity), a.maxQuantity || 0) }
            : a
        ),
      };
    }));
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

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setCouponError('');
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setCouponError('');
  }, []);

  /** Ask the server whether `code` applies to the current subtotal. */
  const applyCoupon = useCallback(async (code) => {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) {
      setCouponError('Enter a coupon code.');
      return false;
    }

    setValidatingCoupon(true);
    setCouponError('');
    try {
      const { data } = await api.validateCoupon(trimmed, subtotal);
      setCoupon({ ...data.coupon, discount: data.discount });
      return true;
    } catch (err) {
      setCoupon(null);
      setCouponError(err.message || 'This coupon could not be applied.');
      return false;
    } finally {
      setValidatingCoupon(false);
    }
  }, [subtotal]);

  // The cart can change after a coupon is applied, so re-check it against the
  // new subtotal and drop it if it no longer qualifies.
  useEffect(() => {
    if (!coupon) return;
    if (items.length === 0) { setCoupon(null); return; }

    let cancelled = false;
    api.validateCoupon(coupon.code, subtotal)
      .then(({ data }) => {
        if (!cancelled) setCoupon({ ...data.coupon, discount: data.discount });
      })
      .catch((err) => {
        if (cancelled) return;
        setCoupon(null);
        setCouponError(err.message || 'Your coupon no longer applies to this cart.');
      });

    return () => { cancelled = true; };
    // Only re-validate when the amount changes, not when `coupon` itself is replaced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, items.length]);

  const discount = coupon?.discount || 0;
  const total = Math.round(Math.max(0, subtotal - discount) * 100) / 100;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, updateAddOnQuantity, clearCart,
      subtotal, discount, total, itemCount,
      coupon, couponError, validatingCoupon, applyCoupon, removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
}
