'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { CartItem, LensItem } from '@/lib/types/lens';

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addToCart: (item: LensItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: LensItem) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        return current.map((entry) =>
          entry.id === item.id ? { ...entry, cartQuantity: entry.cartQuantity + 1 } : entry
        );
      }
      return [...current, { ...item, cartQuantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((entry) => entry.id !== id));
      return;
    }
    setItems((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, cartQuantity: quantity } : entry))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (id: string) => items.some((entry) => entry.id === id),
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
