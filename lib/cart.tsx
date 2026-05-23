'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { buildCartLineId } from '@/lib/cart-utils';
import type { CartItem, LensItem } from '@/lib/types/lens';

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addToCart: (item: LensItem, quantity: number) => void;
  removeFromCart: (cartLineId: string) => void;
  updateQuantity: (cartLineId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (lensId: string) => boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: LensItem, quantity: number) => {
    const safeQuantity = Math.max(1, Math.floor(quantity));
    const cartLineId = buildCartLineId(item);

    setItems((current) => {
      const existing = current.find((entry) => entry.cartLineId === cartLineId);
      if (existing) {
        return current.map((entry) =>
          entry.cartLineId === cartLineId
            ? { ...entry, ...item, cartLineId, cartQuantity: entry.cartQuantity + safeQuantity }
            : entry
        );
      }
      return [...current, { ...item, cartLineId, cartQuantity: safeQuantity }];
    });
  }, []);

  const removeFromCart = useCallback((cartLineId: string) => {
    setItems((current) => current.filter((entry) => entry.cartLineId !== cartLineId));
  }, []);

  const updateQuantity = useCallback((cartLineId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((entry) => entry.cartLineId !== cartLineId));
      return;
    }
    setItems((current) =>
      current.map((entry) => (entry.cartLineId === cartLineId ? { ...entry, cartQuantity: quantity } : entry))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (lensId: string) => items.some((entry) => entry.id === lensId),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, entry) => sum + entry.cartQuantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, entry) => sum + entry.price * entry.cartQuantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      totalPrice,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isInCart,
    }),
    [items, itemCount, totalPrice, addToCart, removeFromCart, updateQuantity, clearCart, isInCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
